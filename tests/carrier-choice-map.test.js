"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const express=require("express");
const Module=require("node:module");
const {isTtn}=require("../server/shipping-utils");

const token="a".repeat(64);
const tokenHash=crypto.createHash("sha256").update(token).digest("hex");
function fresh(){
  return {
    schemaReady:true,
    settings:{
      nova_poshta:{carrier:"nova_poshta",city:"Тестове місто",warehouse:"Відділення 1",
        address:"Вулиця Тестова, 1",latitude:"50.123456",longitude:"31.123456",
        recipient_name:"PRIVATE NOVA",recipient_phone:"+380100000001"},
      ukrposhta:{carrier:"ukrposhta",city:"Тестове місто",warehouse:"Відділення 2",
        address:"Вулиця Тестова, 2",latitude:"50.222222",longitude:"31.222222",
        recipient_name:"PRIVATE UKR",recipient_phone:"+380100000002"}
    },
    legs:[],approved:null,repair:{id:18,user_id:null,status:"pending",name:"Guest Customer",phone:"+380111222333",tracking_code:"RP-"+ "B".repeat(24)}
  };
}
let state=fresh();
const output=(rows)=>({rows,rowCount:rows.length});
const row=(x)=>output([x]);
function dbQuery(sql,args=[]){
  const q=String(sql).replace(/\s+/g," ").trim();
  if(q.includes("to_regclass('shipping_carrier_locations')"))return row({locations:state.schemaReady,tokens:state.schemaReady});
  if(q==="BEGIN"||q==="COMMIT"||q==="ROLLBACK")return output([]);
  if(q.includes("FROM repair_delivery_tokens WHERE service_request_id=$1"))
    return args[0]===18&&args[1]===tokenHash?row({one:1}):output([]);
  if(q.includes("FROM service_requests WHERE id=$1 FOR UPDATE"))return args[0]===18?row(state.repair):output([]);
  if(q.includes("FROM service_requests WHERE id=$1"))return args[0]===18?row(state.repair):output([]);
  if(q.startsWith("SELECT carrier,city,warehouse,address,latitude,longitude FROM shipping_carrier_locations"))
    return output(Object.values(state.settings));
  if(q.startsWith("SELECT carrier,city,warehouse,address,latitude,longitude,recipient_name,recipient_phone FROM shipping_carrier_locations WHERE carrier=$1"))
    return state.settings[args[0]]?row(state.settings[args[0]]):output([]);
  if(q.startsWith("SELECT carrier,city,warehouse,address,latitude,longitude,recipient_name,recipient_phone FROM shipping_carrier_locations"))
    return output(Object.values(state.settings));
  if(q.startsWith("SELECT carrier,status,tracking_number FROM repair_shipments WHERE service_request_id=$1 AND direction='incoming'"))
    return output(state.legs.filter(x=>x.direction==="incoming"));
  if(q.startsWith("SELECT carrier,status,tracking_number FROM repair_shipments WHERE service_request_id=$1 AND direction='incoming' FOR UPDATE"))
    return output(state.legs.filter(x=>x.direction==="incoming"));
  if(q.startsWith("SELECT direction,carrier,status,tracking_number,city,warehouse FROM repair_shipments WHERE service_request_id=$1 FOR UPDATE"))
    return output(state.legs);
  if(q.startsWith("SELECT carrier,recipient_name,recipient_phone,city,warehouse,address,latitude,longitude,approved_at FROM repair_send_instructions"))
    return output(state.approved?[state.approved]:[]);
  if(q.startsWith("DELETE FROM repair_send_instructions")){state.approved=null;return output([]);}
  if(q.startsWith("UPDATE repair_shipments SET carrier=$2,city=''")){
    for(const leg of state.legs.filter(x=>x.direction==="incoming")){
      leg.carrier=args[1];leg.city="";leg.warehouse="";
    }
    return output([]);
  }
  if(q.startsWith("UPDATE repair_shipments SET carrier=$2,updated_at=NOW()")){
    for(const leg of state.legs.filter(x=>x.direction==="outgoing"))leg.carrier=args[1];
    return output([]);
  }
  if(q.startsWith("INSERT INTO repair_shipments(service_request_id,direction,carrier")){
    const direction=q.includes("'incoming'")?"incoming":"outgoing";
    state.legs.push({direction,carrier:args[1],status:"not_sent",tracking_number:null});
    return output([]);
  }
  if(q.startsWith("INSERT INTO repair_send_instructions")){
    const [id,recipient_name,recipient_phone,city,warehouse,carrier,address,latitude,longitude]=args;
    state.approved={service_request_id:id,recipient_name,recipient_phone,city,warehouse,carrier,address,latitude,longitude,approved_at:"2026-11-08"};
    return row(state.approved);
  }
  if(q.startsWith("INSERT INTO shipping_carrier_locations")){
    const names=["carrier","recipient_name","recipient_phone","city","warehouse","address","latitude","longitude"];
    const item=Object.fromEntries(names.map((key,i)=>[key,args[i]]));
    state.settings[item.carrier]=item;
    return output([]);
  }
  throw Error("Unhandled carrier SQL: "+q.slice(0,250));
}
const mockPool={
  async query(sql,args){return dbQuery(sql,args);},
  async connect(){return {query:async(sql,args)=>dbQuery(sql,args),release(){}};}
};
const original=Module._load;
Module._load=function(name,parent,isMain){
  if(name==="../db"&&/[\\/]routes[\\/]shipping-carriers\.js$/.test(parent?.filename||""))return mockPool;
  if(name==="../middleware/requireAdmin"&&/[\\/]routes[\\/]shipping-carriers\.js$/.test(parent?.filename||""))
    return (req,res,next)=>req.session?.user?.admin===true?next():res.status(403).json({message:"Admin only"});
  return original.call(this,name,parent,isMain);
};
let router;
try{router=require("../server/routes/shipping-carriers");}
finally{Module._load=original;}
const app=express();app.use(express.json());
app.use((req,res,next)=>{
  const user=req.get("X-Test-User");
  req.session=user?{user:{id:Number(user),admin:req.get("X-Test-Admin")==="yes"}}:{};
  next();
});
app.use("/api/shipping-carriers",router);
let server,root;
test.before(async()=>{
  server=await new Promise(resolve=>{const s=app.listen(0,"127.0.0.1",()=>resolve(s));});
  root="http://127.0.0.1:"+server.address().port;
});
test.after(()=>new Promise(resolve=>server.close(resolve)));
async function get(url,key=null,asAdmin=false){
  const headers={};
  if(key)headers["X-PULT-Delivery-Key"]=key;
  if(asAdmin){headers["X-Test-User"]="1";headers["X-Test-Admin"]="yes";}
  return fetch(root+url,{headers});
}
async function put(url,body,key=null,asAdmin=false){
  const headers={"Content-Type":"application/json"};
  if(key)headers["X-PULT-Delivery-Key"]=key;
  if(asAdmin){headers["X-Test-User"]="1";headers["X-Test-Admin"]="yes";}
  return fetch(root+url,{method:"PUT",headers,body:JSON.stringify(body)});
}
test.beforeEach(()=>{state=fresh();});

test("customers see a friendly notice instead of SQL steps; admins still see setup diagnostics",async()=>{
  state.schemaReady=false;
  const customer=await get("/api/shipping-carriers/locations");
  assert.equal(customer.status,503);
  const customerMessage=(await customer.json()).message;
  assert.ok(customerMessage.includes("менеджера PULT+"));
  assert.ok(!customerMessage.includes("pgAdmin"));
  assert.ok(!customerMessage.includes(".sql"));
  const admin=await get("/api/shipping-carriers/admin/locations",null,true);
  assert.equal(admin.status,503);
  const adminMessage=(await admin.json()).message;
  assert.ok(adminMessage.includes("carrier-choice-map.sql"));
});
test("public map locations show coordinates and street, NEVER individual phone or name",async()=>{
  const response=await get("/api/shipping-carriers/locations");
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.locations.length,2);
  assert.equal(body.locations[0].configured,true);
  const raw=JSON.stringify(body);
  assert.ok(!raw.includes("PRIVATE"));
  assert.ok(!raw.includes("+380100"));
  assert.ok(raw.includes("50.123456"));
});
test("public repair code alone cannot change carrier or read approved recipient",async()=>{
  const denied=await put("/api/shipping-carriers/request/18",{carrier:"nova_poshta"});
  assert.equal(denied.status,403);
  assert.equal((await get("/api/shipping-carriers/request/18")).status,403);
  assert.equal((await get("/api/shipping-carriers/request/18","b".repeat(64))).status,403);
});
test("guest-created secret token saves carrier after repair, and switching revokes approval",async()=>{
  const first=await put("/api/shipping-carriers/request/18",{carrier:"nova_poshta"},token);
  assert.equal(first.status,200);
  assert.equal(state.legs.length,2);
  assert.ok(state.legs.every(x=>x.carrier==="nova_poshta"));
  state.approved={recipient_name:"PRIVATE NOVA",carrier:"nova_poshta"};
  const second=await put("/api/shipping-carriers/request/18",{carrier:"ukrposhta"},token);
  assert.equal(second.status,200);
  assert.equal(state.approved,null);
  assert.ok(state.legs.every(x=>x.carrier==="ukrposhta"));
  const receipt=await (await get("/api/shipping-carriers/request/18",token)).json();
  assert.equal(receipt.carrier,"ukrposhta");
  assert.equal(receipt.send_to,null);
});
test("only staff can save recipient contact settings, and approval uses correct carrier",async()=>{
  assert.equal((await get("/api/shipping-carriers/admin/locations")).status,403);
  const incoming=await put("/api/shipping-carriers/request/18",{carrier:"ukrposhta"},token);
  assert.equal(incoming.status,200);
  assert.equal((await put("/api/shipping-carriers/admin/requests/18/approve",{approve:true},token)).status,403);
  const approved=await put("/api/shipping-carriers/admin/requests/18/approve",{approve:true},null,true);
  assert.equal(approved.status,200);
  const owner=await (await get("/api/shipping-carriers/request/18",token)).json();
  assert.equal(owner.send_to.recipient_name,"PRIVATE UKR");
  assert.equal(owner.send_to.address,"Вулиця Тестова, 2");
  assert.equal(owner.send_to.carrier,"ukrposhta");
  const publicResponse=await (await get("/api/shipping-carriers/locations")).json();
  assert.ok(!JSON.stringify(publicResponse).includes("PRIVATE UKR"));
});
test("changing the incoming carrier never overwrites an explicitly selected return destination",async()=>{
  state.legs=[
    {direction:"incoming",carrier:"nova_poshta",city:"",warehouse:"",status:"not_sent",tracking_number:null},
    {direction:"outgoing",carrier:"nova_poshta",city:"Яготин",warehouse:"№2",status:"not_sent",tracking_number:null}
  ];
  const changed=await put("/api/shipping-carriers/request/18",{carrier:"ukrposhta"},token);
  assert.equal(changed.status,200);
  assert.equal(state.legs[0].carrier,"ukrposhta");
  assert.equal(state.legs[1].carrier,"nova_poshta");
  assert.equal(state.legs[1].city,"Яготин");
  assert.equal(state.legs[1].warehouse,"№2");
});
test("a shipment with a recorded tracking number locks carrier changes",async()=>{
  state.legs=[{direction:"incoming",carrier:"nova_poshta",status:"registered",tracking_number:"20400000000000"},
    {direction:"outgoing",carrier:"nova_poshta",status:"not_sent",tracking_number:null}];
  const changed=await put("/api/shipping-carriers/request/18",{carrier:"ukrposhta"},token);
  assert.equal(changed.status,409);
  assert.equal(state.legs[0].carrier,"nova_poshta");
});
test("admin must set exact coordinates before approving a location",async()=>{
  state.settings.ukrposhta.latitude=null;
  state.settings.ukrposhta.longitude=null;
  await put("/api/shipping-carriers/request/18",{carrier:"ukrposhta"},token);
  const response=await put("/api/shipping-carriers/admin/requests/18/approve",{approve:true},null,true);
  assert.equal(response.status,409);
});
test("carrier tracking formats, repeatable migration, and map fields",()=>{
  assert.equal(isTtn("20400000000000","nova_poshta"),true);
  assert.equal(isTtn("0505735125464","ukrposhta"),true);
  assert.equal(isTtn("20400000000000","ukrposhta"),false);
  assert.equal(isTtn("12345","nova_poshta"),false);
  const sql=fs.readFileSync(path.join(__dirname,"../server/sql/carrier-choice-map.sql"),"utf8");
  assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS shipping_carrier_locations"));
  assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS repair_delivery_tokens"));
  assert.ok(!/^\s*(?:DROP TABLE|DELETE FROM products|TRUNCATE)\b/im.test(sql));
  const page=fs.readFileSync(path.join(__dirname,"../server/public/repair-submitted.html"),"utf8");
  const script=fs.readFileSync(path.join(__dirname,"../server/public/js/repair-submitted.js"),"utf8");
  assert.ok(page.includes('value="nova_poshta"')&&page.includes('value="ukrposhta"'));
  assert.ok(page.includes('id="carrierMapFrame"'));
  assert.ok(script.includes("https://www.google.com/maps"));
  assert.ok(!script.includes("/api/shipping/admin/recipient"));
  assert.ok(script.includes('"X-PULT-Delivery-Key"'));
});
