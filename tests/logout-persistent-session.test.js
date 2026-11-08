"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Module=require("node:module");
const express=require("express");
const session=require("express-session");
const bcrypt=require("bcrypt");
const PostgresSessionStore=require("../server/session-store");

const user={id:42,name:"Тестовий користувач",email:"logout@example.test",auth_version:0};
let userHash;
const sessions=new Map();
const attempts=new Map();
const log=[];
const result=rows=>({rows,rowCount:rows.length});
const pool={
  async query(sql,args=[]){
    const q=String(sql).replace(/\s+/g," ").trim();
    log.push(q);
    if(q.startsWith("INSERT INTO pult_auth_attempts")){
      const n=(attempts.get(args[0])||0)+1;
      attempts.set(args[0],n);
      return result([{count:n}]);
    }
    if(q.startsWith("DELETE FROM pult_auth_attempts WHERE attempt_key")){
      attempts.delete(args[0]);return result([]);
    }
    if(q.startsWith("SELECT id, name, email, password_hash, auth_version FROM users WHERE lower(email) = $1"))
      return result(args[0]===user.email?[{...user,password_hash:userHash}]:[]);
    if(q.startsWith("INSERT INTO pult_sessions")){
      sessions.set(args[0],{sess:JSON.parse(args[1]),expires_at:args[2]});
      return result([]);
    }
    if(q.startsWith("SELECT sess FROM pult_sessions")){
      const row=sessions.get(args[0]);
      return result(row?[{sess:row.sess}]:[]);
    }
    if(q.startsWith("UPDATE pult_sessions SET expires_at")){
      const entry=sessions.get(args[0]);
      if(entry)entry.expires_at=args[1];
      return result([]);
    }
    if(q.startsWith("DELETE FROM pult_sessions WHERE sid=$1")){
      sessions.delete(args[0]);return result([]);
    }
    throw Error("Unrecognized logout test SQL: "+q);
  }
};

const originalLoad=Module._load;
Module._load=function(request,parent,isMain){
  if(request==="../db"&&/[/\\](?:routes[/\\]auth\.js|server[/\\]auth-security\.js|models[/\\]user\.js)$/.test(parent?.filename||""))
    return pool;
  return originalLoad.call(this,request,parent,isMain);
};
let auth;
try{auth=require("../server/routes/auth");}
finally{Module._load=originalLoad;}

function start(){
  const app=express();
  app.use(express.json());
  app.use(session({
    name:"pult.sid",
    store:new PostgresSessionStore(pool),
    secret:"test-only-secret-string-long-enough-for-hmac",
    resave:false,
    saveUninitialized:false,
    cookie:{httpOnly:true,sameSite:"lax",maxAge:60_000}
  }));
  app.use("/api/auth",auth);
  app.get("/test/session",(req,res)=>res.json({userId:req.session?.user?.id||null}));
  return new Promise(resolve=>{
    const server=app.listen(0,"127.0.0.1",()=>resolve({
      server,base:"http://127.0.0.1:"+server.address().port
    }));
  });
}
async function end(server){await new Promise(resolve=>server.close(resolve));}
function getCookie(response){
  const header=response.headers.get("set-cookie")||"";
  const cookie=header.split(";",1)[0];
  assert.match(cookie,/^pult\.sid=/);
  return cookie;
}
test.before(async()=>{userHash=await bcrypt.hash("valid-password-123",10);});
test.beforeEach(()=>{sessions.clear();attempts.clear();log.length=0;});

test("logout without Content-Type destroys persistent PostgreSQL session and expires pult.sid",async()=>{
  const first=await start();
  let second;
  try{
    const logged=await fetch(first.base+"/api/auth/login",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email:user.email,password:"valid-password-123"})
    });
    assert.equal(logged.status,200);
    const cookie=getCookie(logged);
    assert.equal(sessions.size,1);
    const before=await fetch(first.base+"/test/session",{headers:{Cookie:cookie}});
    assert.equal((await before.json()).userId,42);
    await end(first.server);
    second=await start();
    const recovered=await fetch(second.base+"/test/session",{headers:{Cookie:cookie}});
    assert.equal((await recovered.json()).userId,42,"session survives server restart");
    const logout=await fetch(second.base+"/api/auth/logout",{method:"POST",headers:{Cookie:cookie}});
    assert.equal(logout.status,200,"bodyless logout must succeed");
    assert.equal((await logout.json()).message,"Ви вийшли з акаунта");
    assert.equal(sessions.size,0,"server-side session must be removed");
    assert.match(logout.headers.get("set-cookie")||"",/pult\.sid=;/);
    const oldCookie=await fetch(second.base+"/test/session",{headers:{Cookie:cookie}});
    assert.equal((await oldCookie.json()).userId,null,"old cookie no longer authenticates");
  }finally{
    if(second)await end(second.server);
    else if(first.server.listening)await end(first.server);
  }
});

test("logout rejects cross-origin POST and leaves the user's session intact",async()=>{
  const app=await start();
  try{
    const login=await fetch(app.base+"/api/auth/login",{method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email:user.email,password:"valid-password-123"})});
    const cookie=getCookie(login);
    const attacker=await fetch(app.base+"/api/auth/logout",{method:"POST",
      headers:{Cookie:cookie,Origin:"https://untrusted.example"}});
    assert.equal(attacker.status,403);
    assert.equal(sessions.size,1);
    const stillIn=await fetch(app.base+"/test/session",{headers:{Cookie:cookie}});
    assert.equal((await stillIn.json()).userId,42);
  }finally{await end(app.server);}
});

test("login and registration still require a JSON Content-Type",async()=>{
  const app=await start();
  try{
    const invalid=await fetch(app.base+"/api/auth/login",{method:"POST",
      headers:{"Content-Type":"text/plain"},
      body:JSON.stringify({email:user.email,password:"valid-password-123"})});
    assert.equal(invalid.status,415);
  }finally{await end(app.server);}
});

test("all three logout controls send JSON and redirect to the login page",()=>{
  const cabinet=fs.readFileSync(path.join(__dirname,"../server/public/js/cabinet.js"),"utf8");
  const header=fs.readFileSync(path.join(__dirname,"../server/public/js/auth-ui.js"),"utf8");
  assert.match(cabinet,/"Content-Type": "application\/json"/);
  assert.match(cabinet,/body: "\{\}"/);
  assert.equal((header.match(/fetch\('\/api\/auth\/logout'/g)||[]).length,2);
  assert.equal((header.match(/body: '\{\}'/g)||[]).length,2);
  assert.equal((header.match(/window\.location\.assign\('\/login\.html'\)/g)||[]).length,2);
});
