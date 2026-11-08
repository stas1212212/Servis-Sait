"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Module=require("node:module");
const express=require("express");
const validators=require("../server/shipping-utils");

test("Nova Poshta validators reject invalid TTNs, status/branch combinations and malformed intake",()=>{
  assert.equal(validators.isTtn("20400000000000"),true);
  for(const v of ["", "123","1234567890123a","204000000000001","1".repeat(100)])assert.equal(validators.isTtn(v),false);
  assert.equal(validators.parseShipment({tracking_number:"",status:"in_transit"},"incoming"),null);
  assert.equal(validators.parseShipment({tracking_number:"20400000000000",status:"not_sent"},"incoming"),null);
  assert.equal(validators.parseShipment({tracking_number:"20400000000000",status:"registered"},"outgoing"),null);
  assert.ok(validators.parseShipment({tracking_number:"20400000000000",status:"registered",city:"Київ",warehouse:"Відділення 1",recipient_name:"Клієнт",recipient_phone:"+380000000000"},"outgoing"));
  assert.equal(validators.parseReturnPreference({return_city:"",return_warehouse:"1"}),null);
  assert.ok(validators.parseReturnPreference({return_city:"Київ",return_warehouse:"Відділення 1"}));
  assert.equal(validators.parseIntake({external_condition:"",accessories:"Кабель"}),null);
  assert.ok(validators.parseIntake({external_condition:"Подряпини",accessories:"Без зарядки"}));
});

const mockState={queries:[],failShipmentInsert:false,ready:true,ownerId:4};
const mockPool={
  async query(sql,args){return respond(sql,args);},
  async connect(){return {query:async(sql,args)=>respond(sql,args),release(){mockState.queries.push("RELEASE")}};}
};
function respond(sql,args){
  mockState.queries.push(String(sql));
  if(sql.includes("to_regclass('repair_shipments')"))return {rows:[{shipments:mockState.ready,intakes:mockState.ready,recipient:mockState.ready}],rowCount:1};
  if(sql.includes("FROM shipping_recipient_settings"))return {rows:[{full_name:"PRIVATE PERSON",phone:"+380PRIVATE",city:"Тест",warehouse:"12"}],rowCount:1};
  if(sql.includes("FROM service_requests WHERE id=$1 AND user_id=$2 FOR UPDATE"))
    return args[0]===mockState.ownerId?{rows:[{id:4,status:"pending",name:"Customer",phone:"+380111111111"}],rowCount:1}:{rows:[],rowCount:0};
  if(sql.includes("FROM service_requests WHERE id=$1 FOR UPDATE"))return {rows:[{id:args[0],status:"completed"}],rowCount:1};
  if(sql.includes("FROM repair_shipments WHERE service_request_id"))return {rows:[],rowCount:0};
  if(sql.includes("INSERT INTO service_requests"))return {rows:[{id:77,tracking_code:"RP-"+"A".repeat(24),status:"pending"}],rowCount:1};
  if(sql.includes("INSERT INTO repair_shipments")&&mockState.failShipmentInsert)throw Object.assign(new Error("missing table"),{code:"42P01"});
  return {rows:[],rowCount:1};
}
const originalLoad=Module._load;
Module._load=function(request,parent,isMain){
  const pathname=parent?.filename||"";
  if(/[\\/]routes[\\/](shipping|repairs)\.js$/.test(pathname)&&request==="../db")return mockPool;
  if(/[\\/]routes[\\/]shipping\.js$/.test(pathname)&&request==="../middleware/requireAdmin")
    return (req,res,next)=>req.session?.user?.admin?next():res.status(403).json({message:"Admin only"});
  return originalLoad.call(this,request,parent,isMain);
};
let shipping,repairs;
try{
  shipping=require("../server/routes/shipping");
  repairs=require("../server/routes/repairs");
}finally{Module._load=originalLoad;}
const app=express();
app.use(express.json());
app.use((req,res,next)=>{
  const id=req.get("X-Test-User");
  req.session=id?{user:{id:Number(id),admin:req.get("X-Test-Admin")==="yes"}}:{};
  next();
});
app.use("/api/shipping",shipping);
app.use("/api/repairs",repairs);
let server,root;
test.before(async()=>{server=await new Promise(resolve=>{const s=app.listen(0,"127.0.0.1",()=>resolve(s));});root="http://127.0.0.1:"+server.address().port;});
test.after(()=>new Promise(resolve=>server.close(resolve)));
function put(path,data,headers={}){return fetch(root+path,{method:"PUT",headers:{"Content-Type":"application/json",...headers},body:JSON.stringify(data)});}
test("anonymous readiness exposes no receiver contact details",async()=>{
  const response=await fetch(root+"/api/shipping/availability");
  assert.equal(response.status,200);
  const json=await response.json();
  assert.equal(json.ready,true);
  assert.equal(json.phone,undefined);
  assert.equal(json.full_name,undefined);
});
test("shipping endpoints do not expose account details to anonymous people",async()=>{
  assert.equal((await fetch(root+"/api/shipping/mine")).status,401);
  assert.equal((await fetch(root+"/api/shipping/admin/recipient")).status,403);
  assert.equal((await fetch(root+"/api/shipping/admin/recipient",{headers:{"X-Test-User":"4"}})).status,403);
});
test("clients cannot update another user's incoming TTN",async()=>{
  mockState.ownerId=4;
  mockState.queries.length=0;
  const response=await put("/api/shipping/mine/5/incoming",{tracking_number:"20400000000000"},{"X-Test-User":"4"});
  assert.equal(response.status,404);
  assert.equal(mockState.queries.some(s=>s.includes("INSERT INTO repair_shipments")),false);
  assert.equal(mockState.queries.includes("ROLLBACK"),true);
});
test("incoming TTN must contain exactly 14 digits",async()=>{
  const response=await put("/api/shipping/mine/4/incoming",{tracking_number:"not a number"},{"X-Test-User":"4"});
  assert.equal(response.status,400);
});
test("recipient configuration is writable only by admin",async()=>{
  const sample={full_name:"Тестовий Одержувач",phone:"+380111111111",city:"Київ",warehouse:"1"};
  assert.equal((await put("/api/shipping/admin/recipient",sample,{"X-Test-User":"4"})).status,403);
  assert.equal((await put("/api/shipping/admin/recipient",sample,{"X-Test-User":"4","X-Test-Admin":"yes"})).status,200);
});
test("unmigrated shipping returns 503, while legacy repairs keep working",async()=>{
  mockState.ready=false;
  const availability=await (await fetch(root+"/api/shipping/availability")).json();
  assert.equal(availability.ready,false);
  assert.equal((await fetch(root+"/api/shipping/mine",{headers:{"X-Test-User":"4"}})).status,503);
  const payload={name:"Тестовий клієнт",phone:"+380111111111",device_type:"Ноутбук",issue:"Не вмикається"};
  const normal=await fetch(root+"/api/repairs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
  assert.equal(normal.status,201);
  mockState.failShipmentInsert=true;
  mockState.queries.length=0;
  const delivery=await fetch(root+"/api/repairs",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({...payload,shipping:{return_city:"Київ",return_warehouse:"1"}})});
  assert.equal(delivery.status,503);
  assert.equal(mockState.queries.includes("ROLLBACK"),true);
  assert.equal(mockState.queries.includes("COMMIT"),false);
  mockState.failShipmentInsert=false;
  mockState.ready=true;
});
test("shipping-enabled repair inserts both delivery legs in one transaction",async()=>{
  mockState.queries.length=0;
  const response=await fetch(root+"/api/repairs",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name:"Тестовий клієнт",phone:"+380111111111",device_type:"Ноутбук",issue:"Не вмикається",shipping:{return_city:"Київ",return_warehouse:"1"}})});
  assert.equal(response.status,201);
  const sql=mockState.queries.join("\n");
  assert.ok(sql.includes("BEGIN")&&sql.includes("COMMIT"));
  assert.ok(sql.includes("'incoming'")&&sql.includes("'outgoing'"));
});
test("shipping migration never drops user/order/repair records",()=>{
  const sql=fs.readFileSync(path.resolve(__dirname,"../server/sql/shipping-setup.sql"),"utf8");
  for(const name of ["repair_shipments","repair_intakes","shipping_recipient_settings"])assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS "+name));
  assert.ok(!/\bDROP\s+(?:TABLE|SCHEMA|DATABASE)\b/i.test(sql));
  assert.ok(!/\bTRUNCATE\b/i.test(sql));
  for(const page of ["shipping.html","admin-shipping.html"])assert.ok(fs.existsSync(path.resolve(__dirname,"../server/public",page)));
});
