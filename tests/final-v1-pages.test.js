"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const web=path.resolve(__dirname,"../server/public");
const read=p=>fs.readFileSync(path.join(web,p),"utf8");

test("all static HTML assets and internal document links exist on disk",()=>{
  const pages=fs.readdirSync(web).filter(f=>f.endsWith(".html"));
  const missing=[];
  for(const page of pages){
    const html=read(page);
    const pattern=/\b(?:src|href)\s*=\s*["']([^"']+)["']/g;
    for(const found of html.matchAll(pattern)){
      const raw=found[1];
      if(/^(?:https?:|\/\/|mailto:|tel:|data:|javascript:|#)/i.test(raw))continue;
      let pathname;
      try{pathname=decodeURIComponent(raw.split(/[?#]/,1)[0]);}
      catch(error){missing.push(page+" -> malformed URL "+raw);continue;}
      if(!pathname||pathname==="/"||pathname.startsWith("/api/")||
        pathname.startsWith("/_header")||pathname.startsWith("\${"))continue;
      let target;
      try{
        target=path.resolve(web,pathname.startsWith("/")?pathname.slice(1):pathname);
      }catch(error){missing.push(page+" -> "+raw);continue;}
      if(!target.startsWith(web+path.sep)||!fs.existsSync(target))
        missing.push(page+" -> "+raw);
    }
  }
  assert.deepEqual(missing,[],"Missing internal pages, CSS, JS or assets: "+missing.join("; "));
});
test("shop receipt and checkout show an explicit non-card manual payment flow",()=>{
  const checkout=read("checkout.html");
  const done=read("thanks.html");
  const script=read("js/checkout.js");
  assert.ok(checkout.includes('name="customer_phone"'));
  assert.ok(checkout.includes('name="delivery_branch"'));
  assert.ok(checkout.includes('value="ukrposhta"'));
  assert.ok(checkout.includes("/privacy.html"));
  assert.ok(script.includes("client_request_key:checkoutKey(items)"));
  assert.ok(done.includes("Номер замовлення")||done.includes("thanksOrderNumber"));
  assert.ok(done.includes("Не надсилайте кошти"));
});
test("merchant information and privacy policy are editable rather than invented",()=>{
  const privacy=read("privacy.html");
  const settings=read("admin-hub.html");
  const home=read("index.html");
  assert.ok(privacy.includes('data-site-setting="business_name"'));
  assert.ok(settings.includes('name="business_registration"'));
  assert.ok(!home.includes("1000+"));
  assert.ok(!home.includes("95%"));
  assert.ok(!home.includes("1 день"));
});
test("production session store and auth limits are not memory-only",()=>{
  const app=fs.readFileSync(path.join(__dirname,"../server/app.js"),"utf8");
  const auth=fs.readFileSync(path.join(__dirname,"../server/routes/auth.js"),"utf8");
  const store=fs.readFileSync(path.join(__dirname,"../server/session-store.js"),"utf8");
  assert.ok(app.includes("store: new PostgresSessionStore(pool)"));
  assert.ok(store.includes("pult_sessions"));
  assert.ok(auth.includes("regenerate(req,user)"));
  assert.ok(auth.includes("consume(\"login-ip:\""));
  assert.ok(auth.includes("password.length < 10"));
});
