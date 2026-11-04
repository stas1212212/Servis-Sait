"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Module=require("node:module");
const express=require("express");

let migration=true;
let orders=[];
function initial(){
  orders=[
    {id:2,user_id:7,status:"pending",total:"1580.00",created_at:"2026-11-04T12:00:00.000Z",customer_hidden_at:null},
    {id:3,user_id:8,status:"completed",total:"350.00",created_at:"2026-11-03T12:00:00.000Z",customer_hidden_at:null}
  ];
  migration=true;
}
initial();
const pool={
  async query(sql,args=[]){
    const query=String(sql).replace(/\s+/g," ").trim();
    if(query.includes("FROM information_schema.columns") && query.includes("customer_hidden_at"))
      return {rows:[{ready:migration}],rowCount:1};
    if(query.startsWith("SELECT id, status, total, created_at FROM orders WHERE user_id = $1")){
      return {rows:orders.filter(o=>o.user_id===args[0]&&(!query.includes("customer_hidden_at IS NULL")||!o.customer_hidden_at)),rowCount:1};
    }
    if(query.startsWith("SELECT id, status, total, created_at FROM orders WHERE id = $1 AND user_id = $2")){
      const rows=orders.filter(o=>o.id===args[0]&&o.user_id===args[1]&&(!query.includes("customer_hidden_at IS NULL")||!o.customer_hidden_at));
      return {rows,rowCount:rows.length};
    }
    if(query.startsWith("SELECT order_id, product_name, quantity, price FROM order_items"))
      return {rows:[],rowCount:0};
    if(query.startsWith("UPDATE orders SET customer_hidden_at=NOW()")){
      const result=orders.find(o=>o.id===args[0]&&o.user_id===args[1]&&!o.customer_hidden_at);
      if(result){
        result.customer_hidden_at="2026-11-04T14:00:00Z";
        return {rows:[{id:result.id}],rowCount:1};
      }
      return {rows:[],rowCount:0};
    }
    throw Error("Unexpected SQL: "+query);
  }
};
const originalLoad=Module._load;
Module._load=function(name,parent,isMain){
  if(name==="../db"&&/[\\/]routes[\\/]orders\.js$/.test(parent?.filename||""))return pool;
  return originalLoad.call(this,name,parent,isMain);
};
let router;
try{router=require("../server/routes/orders");}
finally{Module._load=originalLoad;}
const app=express();
app.use(express.json());
app.use((req,res,next)=>{
  const user=req.get("X-Test-User");
  req.session=user?{user:{id:Number(user)}}:{};
  next();
});
app.use("/api/orders",router);
let server,url;
test.before(async()=>{
  server=await new Promise(resolve=>{const s=app.listen(0,"127.0.0.1",()=>resolve(s));});
  url="http://127.0.0.1:"+server.address().port;
});
test.after(()=>new Promise(resolve=>server.close(resolve)));

function visit(route,method="GET",id=7,extra={}){
  return fetch(url+route,{method,headers:{...(id?{"X-Test-User":String(id)}:{}),...extra}});
}
test("orders keep loading before the optional history migration",async()=>{
  initial();migration=false;
  const r=await visit("/api/orders");
  assert.equal(r.status,200);
  assert.equal((await r.json()).length,1);
  const hide=await visit("/api/orders/2","DELETE");
  assert.equal(hide.status,503);
  assert.equal(orders[0].customer_hidden_at,null);
});
test("a logged-out customer cannot hide an order",async()=>{
  initial();
  assert.equal((await visit("/api/orders/2","DELETE",null)).status,401);
});
test("owner restrictions and origin checks protect deletion",async()=>{
  initial();
  assert.equal((await visit("/api/orders/2","DELETE",8)).status,404);
  assert.equal((await visit("/api/orders/2","DELETE",7,{"Origin":"https://another.example"})).status,403);
  assert.equal((await visit("/api/orders/-5","DELETE",7)).status,400);
  assert.equal(orders[0].customer_hidden_at,null);
});
test("customer removes own order from history without cancelling stock or admin record",async()=>{
  initial();
  const response=await visit("/api/orders/2","DELETE",7);
  assert.equal(response.status,200);
  const result=await response.json();
  assert.match(result.message,/не скасоване/);
  assert.equal(orders[0].status,"pending");
  assert.ok(orders[0].customer_hidden_at);
  const list=await (await visit("/api/orders")).json();
  assert.equal(list.length,0);
  assert.equal((await visit("/api/orders/2","GET",7)).status,404);
  assert.equal((await visit("/api/orders/2","DELETE",7)).status,404);
  assert.equal(orders.length,2);
});
test("migration and client implementation do not delete sale/order rows",()=>{
  const sql=fs.readFileSync(path.resolve(__dirname,"../server/sql/order-history-visibility.sql"),"utf8");
  assert.match(sql,/ADD COLUMN IF NOT EXISTS customer_hidden_at/);
  assert.doesNotMatch(sql,/^\s*(?:DROP|TRUNCATE|DELETE)\b/im);
  const cabinet=fs.readFileSync(path.resolve(__dirname,"../server/public/js/cabinet.js"),"utf8");
  assert.ok(cabinet.includes('method: "DELETE"'));
  assert.ok(cabinet.includes("data-hide-order"));
  assert.ok(cabinet.includes("ЦЕ НЕ СКАСОВУЄ"));
});
test("successful repair form redirects to receipt only after the server responds OK",()=>{
  const code=fs.readFileSync(path.resolve(__dirname,"../server/public/js/service-pages.js"),"utf8");
  assert.ok(code.includes('window.location.assign("/repair-submitted.html#"'));
  assert.ok(code.indexOf("if(!response.ok)throw") < code.indexOf('window.location.assign("/repair-submitted.html#"'));
  assert.ok(code.includes('sessionStorage.setItem("pult:last-repair"'));
  assert.ok(code.includes('parameters.set("shipping"'));
});
test("receipt instructs users to wait and never exposes global recipient details",()=>{
  const dir=path.resolve(__dirname,"../server/public");
  const page=fs.readFileSync(path.join(dir,"repair-submitted.html"),"utf8");
  const code=fs.readFileSync(path.join(dir,"js/repair-submitted.js"),"utf8");
  const routes=fs.readFileSync(path.resolve(__dirname,"../server/routes/shipping.js"),"utf8");
  assert.ok(page.includes('id="submittedRecipient"'));
  assert.ok(code.includes('fetch("/api/shipping/mine"'));
  assert.ok(!code.includes("/api/shipping/admin/recipient"));
  assert.ok(routes.includes('router.get("/mine",requireUser'));
  assert.ok(page.includes("Не відправляйте пристрій"));
  const source=fs.readFileSync(path.join(dir,"js/shipping-i18n.js"),"utf8");
  const translations=new Function(
    "const window={addEventListener(){}};const document={readyState:'loading',addEventListener(){}};const localStorage={getItem(){return 'uk';}};"+
    source+";return window.PultShippingI18n.translations;")();
  for(const match of page.matchAll(/data-shipping-i18n="([^"]+)"/g)){
    assert.ok(translations[match[1]],"Missing translation "+match[1]);
  }
  for(const match of code.matchAll(/\bt\("(submit\.[^"]+)"\)/g)){
    assert.ok(translations[match[1]],"Missing dynamic translation "+match[1]);
  }
  for(const [key,values] of Object.entries(translations)){
    assert.equal(values.length,3,key);
  }
});
