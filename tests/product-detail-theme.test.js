"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.resolve(__dirname,"../server/public");
const css=fs.readFileSync(path.join(root,"css/product.css"),"utf8");
const html=fs.readFileSync(path.join(root,"product.html"),"utf8");
function luminance(hex){
  const rgb=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255)
    .map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
  return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
}
function contrast(a,b){
  const x=[luminance(a),luminance(b)].sort((u,v)=>v-u);
  return (x[0]+0.05)/(x[1]+0.05);
}
test("feature, compatibility and description panels pair dark surfaces with readable text",()=>{
  for(const name of ["product-image","info-card","description-card"]){
    assert.ok(css.includes("html.dark ."+name),name);
  }
  assert.match(css,/html\.dark \.product-image,[\s\S]*?html\.dark \.description-card\s*\{[\s\S]*?background:#172235!important/);
  assert.match(css,/html\.dark \.info-card h2,[\s\S]*?html\.dark \.description-card h2\s*\{[\s\S]*?color:#f1f5f9!important/);
  assert.match(css,/html\.dark \.info-card ul,[\s\S]*?html\.dark \.description-card p\s*\{[\s\S]*?color:#cbd5e1!important/);
  assert.ok(contrast("#172235","#f1f5f9")>=4.5);
  assert.ok(contrast("#172235","#cbd5e1")>=4.5);
});
test("product detail cards preserve readable light palette",()=>{
  assert.match(css,/\.info-card h2,[\s\S]*?\.description-card h2\s*\{color:#0f2745\}/);
  assert.ok(contrast("#ffffff","#0f2745")>=4.5);
  assert.ok(contrast("#ffffff","#475569")>=4.5);
});
test("product page loads updated styles with existing details and actions intact",()=>{
  assert.ok(html.includes('href="css/product.css?v=20261108"'));
  assert.ok(html.includes('href="/css/store-product.css?v=20261108"'));
  for(const id of ["productFeatures","productCompatible","productDescriptionLong","productPrice","productImage"]){
    assert.ok(html.includes('id="'+id+'"'),id);
  }
  assert.ok(html.includes('class="buy-btn"'));
});
