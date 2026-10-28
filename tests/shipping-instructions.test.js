"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const Module=require("node:module");
const express=require("express");

const state={
  ready:true,instructionsInstalled:true,
  approved:null,
  shipment:{id:11,status:"not_sent",tracking_number:null},
  recipient:{full_name:"TEST PERSON",phone:"+380000000000",city:"Тестове місто",warehouse:"Відділення 12"}
};
const mockPool={
  query:async (sql,args=[])=>query(sql,args),
  connect:async()=>({query:async(sql,args=[])=>query(sql,args),release(){}})
};
function row(data){return {rows:[data],rowCount:1};}
function query(sql,args){
  const normalized=String(sql).replace(/\s+/g," ");
  if(normalized.includes("to_regclass('repair_shipments')"))return row({
    shipments:state.ready,intakes:state.ready,recipient:state.ready});
  if(normalized.includes("to_regclass('repair_send_instructions')"))return row({installed:state.instructionsInstalled});
  if(normalized.includes("FROM service_requests WHERE user_id=$1 ORDER BY")){
    return {rows:args[0]===4?[{id:4,tracking_code:"RP-"+"A".repeat(24),device_type:"Ноутбук",status:"pending"}]:[],rowCount:args[0]===4?1:0};
  }
  if(normalized.includes("FROM service_requests ORDER BY"))return {rows:[{id:4,name:"Customer",phone:"+380111111111",status:"pending"}],rowCount:1};
  if(normalized.includes("FROM repair_shipments WHERE service_request_id=ANY")){
    return {rows:[{service_request_id:4,direction:"incoming",status:state.shipment.status,tracking_number:state.shipment.tracking_number}],rowCount:1};
  }
  if(normalized.includes("FROM repair_intakes WHERE service_request_id=ANY"))return {rows:[],rowCount:0};
  if(normalized.includes("FROM repair_send_instructions WHERE service_request_id=ANY")){
    return {rows:state.approved?[{service_request_id:4,...state.approved}]:[],rowCount:state.approved?1:0};
  }
  if(normalized.includes("FROM service_requests WHERE id=$1 FOR UPDATE"))return row({id:args[0],status:"pending"});
  if(normalized.includes("FROM repair_shipments WHERE service_request_id=$1 AND direction='incoming' FOR UPDATE"))
    return row(state.shipment);
  if(normalized.includes("FROM shipping_recipient_settings WHERE id=1"))return row(state.recipient);
  if(normalized.includes("INSERT INTO repair_send_instructions")){
    if(!state.instructionsInstalled)throw Object.assign(Error("no relation"),{code:"42P01"});
    state.approved={recipient_name:args[1],recipient_phone:args[2],city:args[3],warehouse:args[4],approved_at:"2026-10-28"};
    return row({service_request_id:4,...state.approved});
  }
  if(normalized.includes("DELETE FROM repair_send_instructions")){state.approved=null;return {rowCount:1,rows:[]};}
  if(["BEGIN","COMMIT","ROLLBACK"].includes(normalized))return {rows:[],rowCount:0};
  throw Error("Unhandled SQL in shipping instructions test: "+normalized.slice(0,250));
}

const originalLoad=Module._load;
Module._load=function(request,parent,isMain){
  const parentFile=parent?.filename||"";
  if(/[\\/]routes[\\/]shipping\.js$/.test(parentFile)&&request==="../db")return mockPool;
  if(/[\\/]routes[\\/]shipping\.js$/.test(parentFile)&&request==="../middleware/requireAdmin")
    return (req,res,next)=>req.session?.user?.admin===true?next():res.status(403).json({message:"Admin only"});
  return originalLoad.call(this,request,parent,isMain);
};
let shipping;
try{shipping=require("../server/routes/shipping");}
finally{Module._load=originalLoad;}
const app=express();app.use(express.json());
app.use((req,res,next)=>{
  const id=req.get("X-Test-User");
  req.session=id?{user:{id:Number(id),admin:req.get("X-Test-Admin")==="yes"}}:{};
  next();
});
app.use("/api/shipping",shipping);
let server,root;
test.before(async()=>{server=await new Promise(resolve=>{const s=app.listen(0,"127.0.0.1",()=>resolve(s));});root="http://127.0.0.1:"+server.address().port;});
test.after(()=>new Promise(resolve=>server.close(resolve)));
function get(path,user){return fetch(root+path,{headers:user?{"X-Test-User":String(user)}:{}});}
function approve(approveFlag,asAdmin=true){
  return fetch(root+"/api/shipping/admin/repairs/4/instructions",{
    method:"PUT",
    headers:{"content-type":"application/json","X-Test-User":"4","X-Test-Admin":asAdmin?"yes":"no"},
    body:JSON.stringify({approve:approveFlag})
  });
}
test("approval route is restricted to staff and requires installed schema",async()=>{
  assert.equal((await approve(true,false)).status,403);
  state.instructionsInstalled=false;
  assert.equal((await approve(true)).status,503);
  state.instructionsInstalled=true;
});
test("physical person data is not on public readiness endpoint or unapproved /mine",async()=>{
  const avail=await (await get("/api/shipping/availability")).json();
  assert.equal(avail.ready,true);
  assert.equal(avail.recipient,undefined);
  const before=await (await get("/api/shipping/mine",4)).json();
  assert.equal(before.repairs[0].send_to,null);
  assert.equal(before.repairs[0].shipments.incoming.recipient_name,undefined);
  assert.equal((await get("/api/shipping/mine")).status,401);
});
test("admin publishes snapshot only to the owner of the selected repair",async()=>{
  const reply=await approve(true);
  assert.equal(reply.status,200);
  const approved=await (await get("/api/shipping/mine",4)).json();
  assert.equal(approved.repairs[0].send_to.recipient_name,"TEST PERSON");
  assert.equal(approved.repairs[0].send_to.warehouse,"Відділення 12");
  const unrelated=await (await get("/api/shipping/mine",5)).json();
  assert.equal(unrelated.repairs.length,0);
  assert.equal((await get("/api/shipping/admin/recipient",4)).status,403);
});
test("recipient snapshot stays unchanged if global settings are edited later",async()=>{
  state.recipient={full_name:"OTHER PERSON",phone:"+380999999999",city:"Other",warehouse:"99"};
  const result=await (await get("/api/shipping/mine",4)).json();
  assert.equal(result.repairs[0].send_to.recipient_name,"TEST PERSON");
});
test("approval can be revoked before sending, and not after TTN registration",async()=>{
  assert.equal((await approve(false)).status,200);
  const after=await (await get("/api/shipping/mine",4)).json();
  assert.equal(after.repairs[0].send_to,null);
  state.shipment.tracking_number="20400000000000";
  assert.equal((await approve(true)).status,409);
  state.shipment.tracking_number=null;
});
test("all translated shipping UI labels exist in each language and the header selector works",()=>{
  const pub=path.resolve(__dirname,"../server/public");
  const source=fs.readFileSync(path.join(pub,"js/shipping-i18n.js"),"utf8");
  const events={},window={addEventListener:(name,cb)=>{events[name]=cb}};
  const document={readyState:"loading",addEventListener(){}};
  const localStorage={getItem:()=> "en"};
  vm.runInNewContext(source,{window,document,localStorage});
  const dictionary=window.PultShippingI18n.translations;
  for(const key of Object.keys(dictionary)){
    assert.equal(dictionary[key].length,3,key);
    assert.ok(dictionary[key].every(x=>typeof x==="string"&&x.trim()),key);
  }
  const targets=["shipping.html","admin-shipping.html","Phone.html","Laptop.html","tv.html","speakers.html","tablet.html","pults-repair.html"];
  for(const name of targets){
    const html=fs.readFileSync(path.join(pub,name),"utf8");
    for(const match of html.matchAll(/data-shipping-(?:i18n|placeholder)="([^"]+)"/g)){
      assert.ok(dictionary[match[1]],name+": "+match[1]);
    }
  }
  for(const script of ["shipping-client.js","shipping-admin.js","service-pages.js"]){
    const code=fs.readFileSync(path.join(pub,"js",script),"utf8");
    for(const match of code.matchAll(/\bt\("([^"]+)"\)/g)) assert.ok(dictionary[match[1]],script+": "+match[1]);
  }
  const header=fs.readFileSync(path.join(pub,"header.html"),"utf8");
  for(const lang of ["uk","en","ru"]) assert.ok(header.includes('data-lang="'+lang+'"'));
  assert.equal(window.PultShippingI18n.t("client.instructionsTitle"),"Where to send your device");
});
test("repeatable database migration adds the instructions table without destructive commands",()=>{
  const sql=fs.readFileSync(path.resolve(__dirname,"../server/sql/shipping-setup.sql"),"utf8");
  assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS repair_send_instructions"));
  assert.ok(!/\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i.test(sql));
  assert.ok(!/\bTRUNCATE\b/i.test(sql));
  const routes=fs.readFileSync(path.resolve(__dirname,"../server/routes/shipping.js"),"utf8");
  assert.ok(routes.includes('router.put("/admin/repairs/:id/instructions"'));
  assert.ok(!routes.includes("router.get(\"/track/:code\"")); 
});


test("global language dictionary covers localized home, contact, delivery and footer elements",()=>{
  const pub=path.resolve(__dirname,"../server/public");
  const i18nCode=fs.readFileSync(path.join(pub,"js/i18n.js"),"utf8");
  const dictionary=new Function(i18nCode+";return PULT_I18N;")();
  const files=["header.html","footer.html","index.html","contacts.html","delivery.html"];
  for(const file of files){
    const html=fs.readFileSync(path.join(pub,file),"utf8");
    for(const match of html.matchAll(/data-i18n="([^"]+)"/g))
      for(const lang of ["uk","en","ru"])
        assert.ok(dictionary[lang][match[1]],file+" "+lang+" "+match[1]);
  }
});
