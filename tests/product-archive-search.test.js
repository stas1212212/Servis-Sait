"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const express=require("express");
const Module=require("node:module");

const initial=()=>[
 {id:1,sku:"tv-sony-001",name:"Пульт Sony",brand:"Sony",model:"X100",category:"tv",price:"249",stock:4,is_active:true},
 {id:2,sku:"old-orion",name:"Пульт Orion",brand:"Orion",model:"old",category:"tv",price:"189",stock:0,is_active:false},
 {id:3,sku:"historic",name:"Кабель HDMI",brand:"",model:"",category:"cables",price:"95",stock:1,is_active:false}
];
let products=initial(),history=[],sqlCalls=[];
const rows=items=>({rows:items,rowCount:items.length});
function query(sql,args=[]){
 const q=String(sql).replace(/\s+/g," ").trim();
 sqlCalls.push({q,args});
 if(["BEGIN","COMMIT","ROLLBACK"].includes(q))return rows([]);
 if(q.startsWith("SELECT id,sku,name,brand,model,description,price,stock,image_url,category,is_active FROM products")){
   let found=products;
   if(q.includes("strpos(")){
     const term=args[0];
     found=products.filter(p=>[p.name,p.sku,p.brand,p.model,p.category].some(x=>String(x||"").toLocaleLowerCase().includes(term)));
   }
   return rows([...found].sort((a,b)=>b.id-a.id).slice(0,500));
 }
 if(q==="UPDATE products SET is_active=$1,updated_at=NOW() WHERE id=$2 RETURNING id,is_active"){
   const p=products.find(x=>x.id===args[1]);if(!p)return rows([]);
   p.is_active=args[0];return rows([{id:p.id,is_active:p.is_active}]);
 }
 if(q==="SELECT id,sku,name,is_active FROM products WHERE id=$1 FOR UPDATE"){
   const p=products.find(x=>x.id===args[0]);return rows(p?[p]:[]);
 }
 if(q.startsWith("SELECT 1 FROM order_items WHERE product_id=$1")){
   return rows(history.some(h=>h.product_id===args[0]||(h.product_id==null&&h.product_name===args[1]))?[{exists:1}]:[]);
 }
 if(q==="DELETE FROM products WHERE id=$1 RETURNING id,sku"){
   const p=products.find(x=>x.id===args[0]);if(!p)return rows([]);
   products=products.filter(x=>x.id!==args[0]);return rows([{id:p.id,sku:p.sku}]);
 }
 throw Error("Unexpected archive test SQL: "+q.slice(0,200));
}
const fakePool={
 query:async(sql,args)=>query(sql,args),
 connect:async()=>({query:async(sql,args)=>query(sql,args),release(){}})
};
const original=Module._load;
Module._load=function(request,parent,isMain){
 const name=parent?.filename||"";
 if(request==="../db"&&/[/\\]routes[/\\]admin\.js$/.test(name))return fakePool;
 if(request==="../middleware/requireAdmin"&&/[/\\]routes[/\\]admin\.js$/.test(name))
   return (req,res,next)=>req.get("X-Admin")==="yes"?next():res.status(403).json({message:"Admin only"});
 return original.call(this,request,parent,isMain);
};
let router;
try{router=require("../server/routes/admin");}finally{Module._load=original;}
const app=express();
app.use(express.json());
app.use((req,res,next)=>{req.session={user:{id:4}};next()});
app.use("/api/admin",router);
let server,root;
test.before(async()=>{
 server=await new Promise(resolve=>{const s=app.listen(0,"127.0.0.1",()=>resolve(s));});
 root="http://127.0.0.1:"+server.address().port;
});
test.after(()=>new Promise(resolve=>server.close(resolve)));
test.beforeEach(()=>{products=initial();history=[];sqlCalls=[]});
const send=(method,resource,body,admin=true,headers={})=>fetch(root+resource,{method,
 headers:{"X-Admin":admin?"yes":"no","Content-Type":"application/json",...headers},
 ...(body===undefined?{}:{body:JSON.stringify(body)})});

test("admin can search across BOTH active and archived inventory, not just currently visible products",async()=>{
 const all=await (await send("GET","/api/admin/products")).json();
 assert.equal(all.products.length,3);
 const found=await send("GET","/api/admin/products?search=orion");
 assert.equal(found.status,200);
 const entries=(await found.json()).products;
 assert.deepEqual(entries.map(x=>x.sku),["old-orion"]);
 assert.equal(entries[0].is_active,false);
 assert.ok(sqlCalls.some(x=>x.q.includes("strpos(lower(coalesce(name,'')),$1)>0")));
 const other=await (await send("GET","/api/admin/products?search=Sony")).json();
 assert.equal(other.products[0].sku,"tv-sony-001");
});
test("admin GET limits search length and denies non-admin access",async()=>{
 assert.equal((await send("GET","/api/admin/products",undefined,false)).status,403);
 assert.equal((await send("GET","/api/admin/products?search="+"a".repeat(121))).status,400);
});
test("hide moves item out of public inventory without changing SKU or stock, restore reverses it",async()=>{
 const hide=await send("PATCH","/api/admin/products/1/visibility",{is_active:false});
 assert.equal(hide.status,200);
 assert.equal(products[0].is_active,false);
 assert.equal(products[0].stock,4);
 assert.equal(products[0].sku,"tv-sony-001");
 assert.equal((await send("PATCH","/api/admin/products/1/visibility",{is_active:true})).status,200);
 assert.equal(products[0].is_active,true);
});
test("visibility rejects cross-origin changes, invalid data, unknown IDs and customer roles",async()=>{
 assert.equal((await send("PATCH","/api/admin/products/1/visibility",{is_active:false},false)).status,403);
 assert.equal((await send("PATCH","/api/admin/products/1/visibility",{is_active:"false"})).status,400);
 assert.equal((await send("PATCH","/api/admin/products/999/visibility",{is_active:false})).status,404);
 assert.equal((await send("PATCH","/api/admin/products/1/visibility",{is_active:false},true,
  {Origin:"https://malicious.example"})).status,403);
});
test("hard deletion only applies to archived products and requires the exact matching SKU",async()=>{
 assert.equal((await send("DELETE","/api/admin/products/1",{confirm_sku:"tv-sony-001"})).status,409);
 assert.equal((await send("DELETE","/api/admin/products/2",{confirm_sku:"wrong"})).status,400);
 assert.equal((await send("DELETE","/api/admin/products/2",{confirm_sku:"old-orion"},false)).status,403);
 const gone=await send("DELETE","/api/admin/products/2",{confirm_sku:"old-orion"});
 assert.equal(gone.status,200);
 assert.equal(products.some(p=>p.id===2),false);
 assert.equal((await send("DELETE","/api/admin/products/2",{confirm_sku:"old-orion"})).status,404);
 assert.ok(sqlCalls.some(x=>x.q==="BEGIN"));
 assert.ok(sqlCalls.some(x=>x.q==="COMMIT"));
});
test("order history blocks permanent deletion including legacy items with null product_id",async()=>{
 history.push({product_id:3,product_name:"Кабель HDMI"});
 const blocked=await send("DELETE","/api/admin/products/3",{confirm_sku:"historic"});
 assert.equal(blocked.status,409);
 assert.equal(products.length,3);
 history=[{product_id:null,product_name:"Пульт Orion"}];
 const old=await send("DELETE","/api/admin/products/2",{confirm_sku:"old-orion"});
 assert.equal(old.status,409);
 assert.equal(products.length,3);
 assert.ok(sqlCalls.some(x=>x.q==="ROLLBACK"));
});
test("admin UI puts product inventory before taxonomy with two tabs, global search and irreversible deletion confirmation",()=>{
 const html=fs.readFileSync(path.join(__dirname,"../server/public/admin.html"),"utf8");
 const script=fs.readFileSync(path.join(__dirname,"../server/public/js/admin-products.js"),"utf8");
 const css=fs.readFileSync(path.join(__dirname,"../server/public/css/admin.css"),"utf8");
 assert.ok(html.indexOf("adminProductViewActive")<html.indexOf("storeTaxonomyAdmin"));
 assert.ok(html.indexOf("adminProductsList")<html.indexOf("storeTaxonomyAdmin"));
 for(const id of ["adminProductViewActive","adminProductViewArchive","adminProductsSearch","adminProductsSort"]){
   assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.ok(script.includes('method:"PATCH"'));
 assert.ok(script.includes('method:"DELETE"'));
 assert.ok(script.includes('window.prompt('));
 assert.ok(script.includes('const groups=query'));
 assert.ok(script.includes('encodeURIComponent(query)'));
 assert.ok(css.includes("html.dark .admin-product-views>button"));
});
