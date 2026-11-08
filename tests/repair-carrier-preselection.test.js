"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const base=path.join(__dirname,"../server/public");
const read=p=>fs.readFileSync(path.join(base,p),"utf8");

test("all six repair forms use one updated two-carrier UI and shipping stylesheet",()=>{
  for(const page of ["Laptop.html","Phone.html","tv.html","tablet.html","speakers.html","pults-repair.html"]){
    const html=read(page);
    assert.ok(html.includes("serviceRepairForm"),page);
    assert.ok(html.includes("service-pages.js?v=20261108-carriers"),page);
    assert.ok(html.includes("service-pages.css?v=20261108-carriers"),page);
    assert.ok(html.includes("shipping-i18n.js?v=20261108-carriers"),page);
  }
  const js=read("js/service-pages.js");
  assert.ok(js.includes('name="incoming_carrier" value="nova_poshta" checked'));
  assert.ok(js.includes('name="incoming_carrier" value="ukrposhta"'));
  assert.ok(js.includes('name="return_carrier"'));
  assert.ok(js.includes("return_carrier:outgoing"));
  assert.ok(js.includes("return_city:"));
  assert.ok(js.includes("carrier:payload.shipping?.carrier||null"));
  assert.ok(js.includes("parameters.set(\"carrier\",receipt.carrier)"));
});
test("receipt automatically preselects the carrier from the submitted repair and verifies database state",()=>{
  const script=read("js/repair-submitted.js");
  const html=read("repair-submitted.html");
  assert.ok(script.includes("selected=validCarrier(info.carrier)?info.carrier:null"));
  assert.ok(script.includes("applySelected(selected)"));
  assert.ok(script.includes("data.carrier"));
  assert.ok(script.includes("/api/shipping-carriers/request/"));
  assert.ok(script.includes("previewMap()"));
  assert.ok(html.includes('value="nova_poshta"'));
  assert.ok(html.includes('value="ukrposhta"'));
  assert.ok(html.includes('src="/js/repair-submitted.js?v=20261108-preselect"'));
});
test("each repair-form shipping label is localized in Ukrainian, English and Russian",()=>{
  const js=read("js/service-pages.js");
  const i18n=read("js/shipping-i18n.js");
  for(const key of ["form.selectIncoming","form.nova","form.ukr","form.returnTitle","form.returnCarrier",
                    "form.sameCarrier","form.returnBranchNova","form.returnBranchUkr"]){
    assert.ok(js.includes(key),key);
    assert.ok(i18n.includes('"'+key+'":['),key);
  }
  assert.ok(js.includes('window.addEventListener("pult:language-changed"'));
  const css=read("css/service-pages.css");
  assert.ok(css.includes("html.dark .service-shipping .service-carrier-choice"));
  assert.ok(css.includes("@media(max-width:470px)"));
});
test("back-end stores both independently and does not require another SQL migration",()=>{
  const repair=fs.readFileSync(path.join(__dirname,"../server/routes/repairs.js"),"utf8");
  const carrier=fs.readFileSync(path.join(__dirname,"../server/routes/shipping-carriers.js"),"utf8");
  const shipping=fs.readFileSync(path.join(__dirname,"../server/routes/shipping.js"),"utf8");
  assert.match(repair,/preference\.return_carrier\|\|preference\.carrier/);
  assert.match(repair,/preference\.carrier/);
  assert.match(carrier,/direction='incoming'/);
  assert.match(carrier,/if\(outgoing&&outgoing\.carrier===old&&!outgoing\.city&&!outgoing\.warehouse\)/);
  assert.match(shipping,/return_carrier/);
});
