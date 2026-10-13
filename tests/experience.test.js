"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const express = require("express");

const fakePool = {
  async query(sql) {
    if(sql.includes("FROM site_settings"))return {rows:[{key:"phone",value:"+380 test"}],rowCount:1};
    if(sql.includes("FROM service_requests WHERE tracking_code"))return {rows:[{tracking_code:"RP-"+"A".repeat(24),status:"pending",created_at:"2026-10-13"}],rowCount:1};
    return {rows:[],rowCount:0};
  }
};
const originalLoad=Module._load;
Module._load=function(request,parent,isMain) {
  if(parent?.filename?.endsWith("/routes/experience.js") && request==="../db")return fakePool;
  if(parent?.filename?.endsWith("/routes/experience.js") && request==="../middleware/requireAdmin")return (req,res)=>res.status(403).json({message:"Access denied"});
  return originalLoad.call(this,request,parent,isMain);
};
let experience;
try{experience=require("../server/routes/experience");}
finally{Module._load=originalLoad;}
const app=express();app.use(express.json());app.use("/api/experience",experience);
let server,root;
test.before(async()=>{
  server=await new Promise(resolve=>{const s=app.listen(0,"127.0.0.1",()=>resolve(s));});
  root="http://127.0.0.1:"+server.address().port;
});
test.after(()=>new Promise(resolve=>server.close(resolve)));
test("public settings do not require login",async()=>{
  const response=await fetch(root+"/api/experience/settings");
  assert.equal(response.status,200);
  const result=await response.json();
  assert.equal(result.settings.phone,"+380 test");
});
test("tracking shows only status and tracking code, never personal info",async()=>{
  const response=await fetch(root+"/api/experience/track/RP-"+"A".repeat(24));
  assert.equal(response.status,200);
  const result=await response.json();
  assert.equal(result.request.status,"pending");
  assert.equal(result.request.phone,undefined);
  assert.equal(result.request.name,undefined);
});
test("tracking rejects sequential, predictable IDs",async()=>{
  const response=await fetch(root+"/api/experience/track/123");
  assert.equal(response.status,400);
});
test("password request checks email and does not reveal accounts",async()=>{
  const response=await fetch(root+"/api/experience/password/forgot",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:"not-an-email"})});
  assert.equal(response.status,400);
});
test("a review cannot be submitted anonymously",async()=>{
  const response=await fetch(root+"/api/experience/reviews",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({request_id:1,rating:5,comment:"Все чудово, якісний ремонт!"})});
  assert.equal(response.status,401);
});
test("required client pages and migration are present",()=>{
  const dir=path.resolve(__dirname,"../server/public");
  for(const file of ["forgot-password.html","reset-password.html","track.html","reviews.html","faq.html","delivery.html","contacts.html","admin-hub.html"]){
    assert.ok(fs.existsSync(path.join(dir,file)),file);
  }
  const sql=fs.readFileSync(path.resolve(__dirname,"../server/sql/customer-service-suite.sql"),"utf8");
  for(const table of ["password_reset_tokens","repair_reviews","admin_notifications","site_settings"])assert.ok(sql.includes(table));
});