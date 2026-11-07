"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const Module=require("node:module");
const express=require("express");

const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const clientCode=read("server/public/js/cabinet.js");

async function renderCabinet(user){
  const children=[];
  const slot={
    replaceChildren(){children.length=0;},
    append(el){children.push(el);}
  };
  const loading={style:{}};
  const doc={
    addEventListener(){},
    getElementById(id){
      if(id==="cabinetAdminLink")return slot;
      if(id==="cabinetContent")return loading;
      return null;
    },
    createElement(tag){
      return {tagName:tag.toUpperCase(),dataset:{},setAttribute(name,value){this[name]=value;}};
    }
  };
  let i18n=0;
  const context=vm.createContext({
    document:doc,
    window:{location:{href:""}},
    fetch:async url=>{
      assert.equal(url,"/api/auth/me");
      return {ok:true,json:async()=>({user})};
    },
    console,
    applySiteLanguage:()=>{i18n++}
  });
  vm.runInContext(clientCode,context);
  await vm.runInContext("loadCabinet()",context);
  return {links:children,localeCalls:i18n};
}
test("ordinary customers never receive the admin shortcut in their cabinet",async()=>{
  for(const role of ["customer","user",null,undefined]){
    const r=await renderCabinet({id:2,name:"Customer",email:"customer@example.test",role});
    assert.equal(r.links.length,0);
  }
});
test("admins receive one translated shortcut to /admin.html",async()=>{
  const r=await renderCabinet({id:1,name:"Manager",email:"admin@example.test",role:"admin"});
  assert.equal(r.links.length,1);
  assert.equal(r.links[0].href,"/admin.html");
  assert.equal(r.links[0].dataset.i18n,"cabinet.adminLink");
  assert.equal(r.localeCalls,1);
});
test("user info endpoint reads role from the actual PostgreSQL users record",()=>{
  const model=read("server/models/user.js");
  assert.match(model,/SELECT id, name, email, role, created_at, auth_version\s+FROM users/);
  const auth=read("server/routes/auth.js");
  assert.match(auth,/router\.get\("\/me"[\s\S]*?getUserById\(req\.session\.user\.id\)/);
  const cabinet=read("server/public/cabinet.html");
  assert.match(cabinet,/id="cabinetAdminLink"/);
  assert.doesNotMatch(cabinet,/<a[^>]*href="\/admin\.html"[^>]*>.*Адмін/s);
});
test("direct admin HTML URLs are gated before express.static",()=>{
  const app=read("server/app.js");
  const guarded="app.get(['/admin.html', '/admin-hub.html', '/admin-shipping.html'], requireAdminPage";
  assert.ok(app.includes(guarded));
  assert.ok(app.indexOf(guarded)<app.indexOf("app.use(express.static("));
});
test("server admin middleware rejects anonymous and ordinary customers",async()=>{
  const origin=Module._load;
  Module._load=function(name,parent,isMain){
    if(name==="../db" && /[/\\]middleware[/\\]requireAdmin\.js$/.test(parent?.filename||""))
      return {query:async(_sql,args)=>({rows:[{role:args[0]===1?"admin":"customer"}]})};
    return origin.call(this,name,parent,isMain);
  };
  let adminGuard;
  try{adminGuard=require("../server/middleware/requireAdmin");}
  finally{Module._load=origin;}
  const app=express();
  app.use((req,res,next)=>{
    const id=req.get("X-User");
    req.session={user:id?{id:Number(id)}:undefined};next();
  });
  app.get("/admin.html",adminGuard,(_req,res)=>res.send("admin workspace"));
  const server=await new Promise(resolve=>{
    const s=app.listen(0,"127.0.0.1",()=>resolve(s));
  });
  const url="http://127.0.0.1:"+server.address().port+"/admin.html";
  try{
    let res=await fetch(url);
    assert.equal(res.status,401);
    res=await fetch(url,{headers:{"X-User":"2"}});
    assert.equal(res.status,403);
    res=await fetch(url,{headers:{"X-User":"1"}});
    assert.equal(res.status,200);
    assert.equal(await res.text(),"admin workspace");
  }finally{await new Promise(resolve=>server.close(resolve));}
});
