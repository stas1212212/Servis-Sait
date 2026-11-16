"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Module=require("node:module");
const attempts=new Map();
const originalLoad=Module._load;
Module._load=function(request,parent,isMain){
  if(request==="../auth-security"&&/[/\\]middleware[/\\]traffic-protection\.js$/.test(parent?.filename||"")){
    return {consume:async(key,max,minutes)=>{
      const count=(attempts.get(key)||0)+1;
      attempts.set(key,count);
      return count<=max;
    }};
  }
  return originalLoad.call(this,request,parent,isMain);
};
let protect;
try{protect=require("../server/middleware/traffic-protection");}
finally{Module._load=originalLoad;}
const saved={};
const keys=["TURNSTILE_SITEKEY","TURNSTILE_SECRET_KEY","NODE_ENV","PUBLIC_BASE_URL"];
function withEnv(values,callback){
  for(const key of keys)saved[key]=process.env[key];
  for(const key of keys)delete process.env[key];
  Object.assign(process.env,values);
  try{return callback();}
  finally{for(const key of keys){
    if(saved[key]===undefined)delete process.env[key];
    else process.env[key]=saved[key];
  }}
}
const PASS_SITE="1x00000000000000000000AA";
const PASS_SECRET="1x0000000000000000000000000000000AA";
const fakeResponse=(success=true,action="repair",hostname="example.ua")=>({
 ok:true,json:async()=>({success,action,hostname})
});
function response(){
 const state={code:200,headers:{}};
 return {
  state,
  set(name,value){state.headers[name]=value;return this;},
  status(code){state.code=code;return this;},
  json(data){state.payload=data;return this;}
 };
}

test("local development permits no Turnstile until both credentials are explicitly supplied",()=>{
 withEnv({NODE_ENV:"development"},()=>{
  assert.deepEqual(protect.publicConfig(),{enabled:false,sitekey:null});
 });
 withEnv({NODE_ENV:"development",TURNSTILE_SITEKEY:PASS_SITE,TURNSTILE_SECRET_KEY:PASS_SECRET},()=>{
  const config=protect.publicConfig();
  assert.equal(config.enabled,true);
  assert.equal(config.sitekey,PASS_SITE);
  assert.equal(JSON.stringify(config).includes(PASS_SECRET),false,"secret must never reach browser");
 });
 withEnv({TURNSTILE_SITEKEY:PASS_SITE},()=>assert.throws(()=>protect.getConfig(),/must be set together/));
});

test("production refuses missing keys, official dummy credentials or non-HTTPS public URLs",()=>{
 withEnv({NODE_ENV:"production",PUBLIC_BASE_URL:"https://example.ua"},()=>{
  assert.throws(()=>protect.getConfig(),/Configure Turnstile/);
 });
 withEnv({NODE_ENV:"production",PUBLIC_BASE_URL:"https://example.ua",TURNSTILE_SITEKEY:PASS_SITE,TURNSTILE_SECRET_KEY:PASS_SECRET},()=>{
  assert.throws(()=>protect.getConfig(),/test keys are forbidden/);
 });
 withEnv({NODE_ENV:"production",PUBLIC_BASE_URL:"http://example.ua",TURNSTILE_SITEKEY:"live-key",TURNSTILE_SECRET_KEY:"live-secret"},()=>{
  assert.throws(()=>protect.getConfig(),/HTTPS hostname/);
 });
});

test("Siteverify checks format, response success, action and expected production hostname",async()=>{
 let calls=0;
 const verifier=async(_url,options)=>{
  calls++;
  assert.equal(options.method,"POST");
  assert.ok(String(options.body).includes("secret=test-secret"));
  return fakeResponse(true,"repair","shop.example.ua");
 };
 const opts={secret:"test-secret",action:"repair",hostname:"shop.example.ua",production:true,testKeys:false,fetchImpl:verifier};
 assert.deepEqual(await protect.verifyToken("",opts),{ok:false,reason:"missing"});
 assert.deepEqual(await protect.verifyToken("a".repeat(2049),opts),{ok:false,reason:"missing"});
 assert.deepEqual(await protect.verifyToken("token",opts),{ok:true});
 assert.equal(calls,1);
 assert.deepEqual(await protect.verifyToken("token",{...opts,hostname:"evil.example"}),{ok:false,reason:"mismatch"});
 assert.deepEqual(await protect.verifyToken("token",{...opts,action:"register"}),{ok:false,reason:"mismatch"});
 assert.deepEqual(await protect.verifyToken("token",{...opts,fetchImpl:async()=>fakeResponse(false)}),{ok:false,reason:"invalid"});
 assert.deepEqual(await protect.verifyToken("token",{...opts,fetchImpl:async()=>({ok:false})}),{ok:false,reason:"service"});
});
test("official test credentials skip artificial action/hostname only in non-production tests",async()=>{
 const testResponse=async()=>({ok:true,json:async()=>({success:true,hostname:"example.com"})});
 const opts={secret:PASS_SECRET,action:"repair",hostname:"localhost",testKeys:true,production:false,fetchImpl:testResponse};
 assert.deepEqual(await protect.verifyToken("XXXX.DUMMY.TOKEN.XXXX",opts),{ok:true});
 assert.deepEqual(await protect.verifyToken("XXXX.DUMMY.TOKEN.XXXX",{...opts,production:true}),{ok:false,reason:"mismatch"});
});
test("guard refuses direct POST without a challenge, rejects invalid submissions and accepts a valid local test token",async()=>{
 const previousFetch=global.fetch;
 const env={NODE_ENV:"development",TURNSTILE_SITEKEY:PASS_SITE,TURNSTILE_SECRET_KEY:PASS_SECRET,PUBLIC_BASE_URL:"http://localhost:3000"};
 try{
  await withEnv(env,async()=>{
    global.fetch=async()=>({ok:true,json:async()=>({success:true,hostname:"example.com"})});
    const guard=protect.turnstileGuard("repair");
    const req={method:"POST",body:{},ip:"127.0.0.1"};
    let res=response(),advanced=0;
    await guard(req,res,()=>advanced++);
    assert.equal(res.state.code,400);
    assert.equal(advanced,0);
    req.body.turnstile_token="XXXX.DUMMY.TOKEN.XXXX";
    res=response();await guard(req,res,()=>advanced++);
    assert.equal(advanced,1);
    req.body.turnstile_token=123;
    res=response();await guard(req,res,()=>advanced++);
    assert.equal(res.state.code,400);
    global.fetch=async()=>({ok:true,json:async()=>({success:false})});
    req.body.turnstile_token="invalid-token";
    res=response();await guard(req,res,()=>advanced++);
    assert.equal(res.state.code,403);
    assert.equal(advanced,1);
  });
 }finally{global.fetch=previousFetch;}
});
test("PostgreSQL-backed limiter blocks after quota, returns 429 and Retry-After; GET remains unaffected",async()=>{
 attempts.clear();
 const limited=protect.writeLimiter("repair",2,10);
 const req={method:"POST",ip:"127.0.0.1"},next=()=>{next.called++};next.called=0;
 for(let i=0;i<2;i++)await limited(req,response(),next);
 assert.equal(next.called,2);
 let res=response();
 await limited(req,res,next);
 assert.equal(res.state.code,429);
 assert.equal(res.state.headers["Retry-After"],"600");
 assert.equal(next.called,2);
 await limited({method:"GET",ip:"127.0.0.1"},response(),next);
 assert.equal(next.called,3);
 assert.equal(attempts.size,1);
});
test("Cloudflare client helper only fetches a public sitekey and required forms submit tokens",()=>{
 const base=path.resolve(__dirname,"../server/public");
 const read=p=>fs.readFileSync(path.join(base,p),"utf8");
 const app=fs.readFileSync(path.resolve(__dirname,"../server/app.js"),"utf8");
 const middleware=fs.readFileSync(path.resolve(__dirname,"../server/middleware/traffic-protection.js"),"utf8");
 assert.ok(app.includes('app.get("/api/security/turnstile"'));
 assert.ok(app.includes('app.use("/api/repairs",writeLimiter("repair",6,10),turnstileGuard("repair"))'));
 assert.ok(app.includes('app.use("/api/auth/register",writeLimiter("register",8,60),turnstileGuard("register"))'));
 assert.ok(app.includes('app.use("/api/experience/password/forgot",writeLimiter("forgot",8,20),turnstileGuard("forgot"))'));
 assert.ok(app.includes('app.use("/api/orders",writeLimiter("checkout",12,10))'));
 assert.ok(middleware.includes("https://challenges.cloudflare.com/turnstile/v0/siteverify"));
 assert.ok(read("js/turnstile-client.js").includes("window.PultTurnstile={mount}"));
 assert.ok(read("js/service-pages.js").includes("payload.turnstile_token=token"));
 assert.ok(read("js/register.js").includes("turnstile_token"));
 assert.ok(read("js/experience-pages.js").includes("turnstile_token"));
 for(const page of ["Laptop.html","Phone.html","tv.html","tablet.html","speakers.html","pults-repair.html","register.html","forgot-password.html"]){
   const html=read(page);
   assert.ok(html.includes("/js/turnstile-client.js"),page);
   assert.ok(html.includes("/css/turnstile.css"),page);
 }
});
