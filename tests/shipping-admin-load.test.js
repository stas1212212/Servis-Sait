"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"../server/public");
const carrier=fs.readFileSync(path.join(root,"js/shipping-carrier-admin.js"),"utf8");
const shipping=fs.readFileSync(path.join(root,"js/shipping-admin.js"),"utf8");
const html=fs.readFileSync(path.join(root,"admin-shipping.html"),"utf8");

async function load(statusCode){
  const listeners={};
  const formFields=Object.fromEntries(
    ["recipient_name","recipient_phone","city","warehouse","address","latitude","longitude"]
      .map(key=>[key,{value:""}]));
  const form={
    elements:{namedItem:name=>formFields[name]},
    addEventListener(){},
    querySelector:()=>({disabled:false})
  };
  const feedback={textContent:"",dataset:{}};
  const message={textContent:"Перевіряємо доступ…"};
  const workspace={hidden:true};
  const select={value:"nova_poshta",addEventListener(){}};
  const nodes={
    carrierLocationForm:form,carrierAdminSelect:select,
    carrierAdminFeedback:feedback,shippingAdminMessage:message,
    shippingAdminWorkspace:workspace
  };
  const calls=[];
  const document={
    getElementById:id=>nodes[id]||null,
    addEventListener(name,handler){listeners[name]=handler;}
  };
  const fetch=async url=>{
    calls.push(url);
    return {ok:statusCode===200,status:statusCode,json:async()=>statusCode===200
      ? {locations:[{carrier:"nova_poshta",city:"Яготин",warehouse:"№ 1",address:"Адреса"}]}
      : {message:"Адміністратор має виконати carrier-choice-map.sql у pgAdmin"}};
  };
  const ctx={document,fetch,window:{},AbortController,FormData,setTimeout,clearTimeout,console,Error,JSON,Object,String,encodeURIComponent};
  vm.runInNewContext(carrier,ctx);
  listeners.DOMContentLoaded();
  await new Promise(done=>setTimeout(done,10));
  return {workspace,message,feedback,fields:formFields,calls};
}
test("shipping carrier setup opens independently of legacy shipment/recipient endpoints",async()=>{
  const result=await load(200);
  assert.equal(result.workspace.hidden,false);
  assert.equal(result.fields.city.value,"Яготин");
  assert.equal(result.message.textContent,"");
  assert.deepEqual(result.calls,["/api/shipping-carriers/admin/locations"]);
  assert.doesNotMatch(shipping,/Promise\.all\(\[api\("\/recipient"\),api\("\/repairs"\)\]\)/);
  assert.match(shipping,/await api\("\/repairs"\)/);
});
test("missing carrier migration shows a human-readable error instead of frozen access loading",async()=>{
  const result=await load(503);
  assert.equal(result.workspace.hidden,true);
  assert.match(result.message.textContent,/carrier-choice-map\.sql/);
  assert.notEqual(result.message.textContent,"Перевіряємо доступ…");
});
test("admin page always loads updated scripts after browser refresh",()=>{
  assert.ok(html.includes('shipping-admin.js?v=20261108-admin-fix'));
  assert.ok(html.includes('shipping-carrier-admin.js?v=20261108-admin-fix'));
});


test("server rejects compressed request bodies and uses the simple query parser during dependency upgrade",()=>{
  const app=fs.readFileSync(path.resolve(__dirname,"../server/app.js"),"utf8");
  assert.ok(app.includes("app.set('query parser','simple')"));
  assert.ok(app.includes("express.json({limit:'48kb',inflate:false})"));
  assert.ok(app.includes("express.urlencoded({ extended: false, limit:'48kb',inflate:false })"));
});
