"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.resolve(__dirname,"../server/public");
const content=path=>fs.readFileSync(require("node:path").join(root,path),"utf8");
const cart=content("css/cart.css");
const checkout=content("css/checkout.css");
const modal=content("css/cart-modal.css");
const cartHtml=content("cart.html");
const checkoutHtml=content("checkout.html");

function luminance(hex) {
  const values=hex.slice(1).match(/.{2}/g).map(x=>parseInt(x,16)/255)
    .map(x=>x<=0.04045?x/12.92:((x+.055)/1.055)**2.4);
  return values[0]*.2126+values[1]*.7152+values[2]*.0722;
}
function contrast(background,foreground) {
  const list=[luminance(background),luminance(foreground)].sort((a,b)=>b-a);
  return (list[0]+.05)/(list[1]+.05);
}
test("cart empty-state, summary and product cards have dark surfaces AND readable text",()=>{
  for(const selector of [".summary-card","#emptyCart",".cart-item"]) {
    assert.ok(cart.includes("html.dark "+selector),selector);
  }
  assert.match(cart,/html\.dark \.summary-card[\s\S]*?background:#172235!important/);
  assert.match(cart,/html\.dark \.summary-card h2[\s\S]*?color:#f1f5f9!important/);
  assert.ok(contrast("#172235","#f1f5f9")>=4.5);
  assert.ok(contrast("#172235","#e2e8f0")>=4.5);
  assert.ok(contrast("#172235","#b7c9df")>=4.5);
  assert.ok(contrast("#ffffff","#1e293b")>=4.5);
});
test("checkout form AND order summary are dark themed; inputs remain readable",()=>{
  assert.match(checkout,/html\.dark \.checkout-card,[\s\S]*?html\.dark \.checkout-summary\s*\{[\s\S]*?background:#172235!important/);
  assert.match(checkout,/html\.dark \.checkout-product p\s*\{color:#b7c9df!important/);
  assert.match(checkout,/html\.dark \.checkout-card input,[\s\S]*?background:#101a2b!important;color:#f1f5f9!important/);
  assert.ok(contrast("#101a2b","#f1f5f9")>=4.5);
});
test("add-to-cart modal also has a dark background and foreground",()=>{
  assert.match(modal,/html\.dark \.cart-modal\s*\{[\s\S]*?background:#172235!important;[\s\S]*?color:#e2e8f0!important/);
  assert.ok(contrast("#263954","#e2e8f0")>=4.5);
});
test("checkout button is disabled for empty carts and enabled after adding items",()=>{
  const script=content("js/cart-page.js");
  const checkoutScript=content("js/checkout.js");
  assert.match(cartHtml,/<button id="checkoutButton" type="button" disabled/);
  assert.match(script,/checkout\.disabled=products\.length===0/);
  assert.match(checkoutScript,/submit\.disabled=cart\.length===0/);
  assert.match(cart,/\.checkout-btn:disabled\s*\{/);
  assert.match(checkout,/\.checkout-button:disabled\s*\{/);
});
test("CSS files are refreshed to prevent stale dark-theme cache",()=>{
  for(const file of ["css/cart.css","css/checkout.css","css/cart-modal.css"])
    assert.ok(cartHtml.includes(file+"?v=20261108"));
  assert.ok(checkoutHtml.includes("css/checkout.css?v=20261108"));
});
