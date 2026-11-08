"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const Module=require("node:module");
const express=require("express");
const attempts=new Map();
const sessions=new Map();
const pool={
  async query(sql,args=[]){
    const text=String(sql).replace(/\s+/g," ").trim();
    if(text.startsWith("INSERT INTO pult_auth_attempts")){
      const digest=args[0];
      const count=(attempts.get(digest)||0)+1;attempts.set(digest,count);
      return {rows:[{count}],rowCount:1};
    }
    if(text.startsWith("DELETE FROM pult_auth_attempts WHERE attempt_key")){
      attempts.delete(args[0]);return {rows:[],rowCount:0};
    }
    if(text.startsWith("DELETE FROM pult_auth_attempts WHERE expires_at"))return {rows:[],rowCount:0};
    if(text.startsWith("INSERT INTO pult_sessions")){
      sessions.set(args[0],{sess:JSON.parse(args[1]),expires_at:args[2]});return {rows:[],rowCount:1};
    }
    if(text.startsWith("SELECT sess FROM pult_sessions")){
      return {rows:sessions.has(args[0])?[{sess:sessions.get(args[0]).sess}]:[],rowCount:sessions.has(args[0])?1:0};
    }
    if(text.startsWith("UPDATE pult_sessions SET expires_at")){
      if(sessions.has(args[0]))sessions.get(args[0]).expires_at=args[1];
      return {rows:[],rowCount:0};
    }
    if(text.startsWith("DELETE FROM pult_sessions WHERE sid=")){
      sessions.delete(args[0]);return {rows:[],rowCount:0};
    }
    if(text.startsWith("DELETE FROM pult_sessions")){sessions.clear();return {rows:[],rowCount:0};}
    throw Error("Unexpected auth SQL: "+text);
  }
};
const original=Module._load;
Module._load=function(name,parent,isMain){
  if(name==="./db" && /[/\\]server[/\\]auth-security\.js$/.test(parent?.filename||""))return pool;
  return original.call(this,name,parent,isMain);
};
let security;
try{security=require("../server/auth-security");}finally{Module._load=original;}
const Store=require("../server/session-store");
test.beforeEach(()=>{attempts.clear();sessions.clear();});
test("shared login throttle limits attempts and can clear an authenticated account",async()=>{
  assert.equal(await security.consume("login-account:demo@example.test",2,15),true);
  assert.equal(await security.consume("login-account:demo@example.test",2,15),true);
  assert.equal(await security.consume("login-account:demo@example.test",2,15),false);
  assert.equal(attempts.size,1);
  assert.ok(![...attempts.keys()][0].includes("demo"));
  await security.clear("login-account:demo@example.test");
  assert.equal(await security.consume("login-account:demo@example.test",2,15),true);
});
test("session is regenerated before assigning authenticated identity",async()=>{
  const req={session:{regenerate(cb){this.didRegenerate=true;cb();}}};
  await security.regenerate(req,{id:7,name:"Buyer",email:"buyer@example.test",auth_version:2});
  assert.equal(req.session.didRegenerate,true);
  assert.equal(req.session.user.id,7);
});
test("PostgreSQL session store saves, reads, touches and destroys a real session",async()=>{
  const store=new Store(pool);
  const cookie={expires:new Date(Date.now()+60_000).toISOString()};
  await new Promise((ok,fail)=>store.set("demo-session",{cookie,user:{id:7}},e=>e?fail(e):ok()));
  const restored=await new Promise((ok,fail)=>store.get("demo-session",(e,v)=>e?fail(e):ok(v)));
  assert.equal(restored.user.id,7);
  await new Promise((ok,fail)=>store.touch("demo-session",{cookie},e=>e?fail(e):ok()));
  await new Promise((ok,fail)=>store.destroy("demo-session",e=>e?fail(e):ok()));
  const missing=await new Promise((ok,fail)=>store.get("demo-session",(e,v)=>e?fail(e):ok(v)));
  assert.equal(missing,null);
});
test("origin gate denies requests from other sites",async()=>{
  const app=express();
  app.use(express.json());
  app.post("/protected",security.sameOrigin,(_req,res)=>res.sendStatus(204));
  const server=await new Promise(resolve=>{
    const s=app.listen(0,"127.0.0.1",()=>resolve(s));
  });
  const url="http://127.0.0.1:"+server.address().port+"/protected";
  try{
    const foreign=await fetch(url,{method:"POST",headers:{"Origin":"https://untrusted.example","Content-Type":"application/json"},body:"{}"});
    assert.equal(foreign.status,403);
    const local=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
    assert.equal(local.status,204);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
