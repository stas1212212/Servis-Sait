"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Module=require("node:module");
const express=require("express");

function setup(){
  return {
    ready:true,operations:[],nextCategory:50,nextBrand:50,nextProduct:50,
    categories:[
      {slug:"tv",name_uk:"Пульти для телевізорів",name_en:"TV remotes",name_ru:"Пульты для телевизоров",icon:"📺",sort_order:10,is_active:true},
      {slug:"batteries",name_uk:"Батарейки",name_en:"Batteries",name_ru:"Батарейки",icon:"🔋",sort_order:80,is_active:true},
      {slug:"headphones",name_uk:"Навушники",name_en:"Headphones",name_ru:"Наушники",icon:"🎧",sort_order:90,is_active:true}
    ],
    brands:[{id:1,name:"Sony",is_active:true},{id:2,name:"Anker",is_active:true}],
    products:[
      {id:1,sku:"remote001",name:"Пульт Sony",brand:"Sony",category:"tv",price:"349.00",stock:3,is_active:true,image_url:"img/products/sony.webp"},
      {id:2,sku:"battery001",name:"Батарейка AA",brand:"Anker",category:"batteries",price:"49.00",stock:12,is_active:true,image_url:"img/products/battery.webp"}
    ]
  };
}
let state=setup();
function result(rows){return {rows,rowCount:rows.length};}
function dbQuery(sql,args=[]){
  const q=String(sql).replace(/\s+/g," ").trim();
  state.operations.push(q);
  if(q==="BEGIN"||q==="COMMIT"||q==="ROLLBACK")return result([]);
  if(q.includes("to_regclass('product_categories')"))return result([{categories:state.ready,brands:state.ready}]);
  if(q.includes("FROM product_categories c WHERE c.is_active=TRUE"))
    return result(state.categories.filter(c=>c.is_active).map(c=>({...c,
      product_count:state.products.filter(p=>p.category===c.slug&&p.is_active).length,
      available_count:state.products.filter(p=>p.category===c.slug&&p.is_active&&p.stock>0).length})));
  if(q==="SELECT name FROM product_brands WHERE is_active=TRUE ORDER BY name")
    return result(state.brands.filter(b=>b.is_active).map(b=>({name:b.name})));
  if(q.startsWith("SELECT slug,name_uk,name_en,name_ru,icon,sort_order,is_active FROM product_categories"))
    return result(state.categories);
  if(q==="SELECT id,name,is_active FROM product_brands ORDER BY lower(name)")return result(state.brands);
  if(q.startsWith("SELECT slug FROM product_categories WHERE slug=$1 AND is_active=TRUE"))
    return result(state.categories.filter(c=>c.slug===args[0]&&c.is_active).map(c=>({slug:c.slug})));
  if(q.startsWith("SELECT name FROM product_brands WHERE lower(name)=lower($1) AND is_active=TRUE"))
    return result(state.brands.filter(b=>b.name.toLowerCase()===args[0].toLowerCase()&&b.is_active).map(b=>({name:b.name})));
  if(q.startsWith("INSERT INTO product_categories")){
    const slug=args[0];
    if(state.categories.some(c=>c.slug===slug))throw Object.assign(Error("duplicate"),{code:"23505"});
    state.categories.push({slug,name_uk:args[1],name_en:args[2],name_ru:args[3],icon:args[4],sort_order:args[5],is_active:args[6]});
    return result([{slug}]);
  }
  if(q.startsWith("UPDATE product_categories SET")){
    const c=state.categories.find(x=>x.slug===args[6]);
    if(!c)return result([]);
    Object.assign(c,{name_uk:args[0],name_en:args[1],name_ru:args[2],icon:args[3],sort_order:args[4],is_active:args[5]});
    return result([{slug:c.slug}]);
  }
  if(q.startsWith("INSERT INTO product_brands")){
    if(state.brands.some(b=>b.name.toLowerCase()===args[0].toLowerCase()))throw Object.assign(Error("duplicate"),{code:"23505"});
    const id=state.nextBrand++;
    state.brands.push({id,name:args[0],is_active:args[1]});
    return result([{id}]);
  }
  if(q.startsWith("SELECT name FROM product_brands WHERE id=$1 FOR UPDATE"))
    return result(state.brands.filter(b=>b.id===args[0]).map(b=>({name:b.name})));
  if(q.startsWith("UPDATE product_brands SET")){
    const b=state.brands.find(b=>b.id===args[2]);
    if(!b)return result([]);
    b.name=args[0];b.is_active=args[1];
    return result([{id:b.id}]);
  }
  if(q.startsWith("UPDATE products SET brand=$1")){
    for(const p of state.products)if(p.brand?.toLowerCase()===args[1].toLowerCase())p.brand=args[0];
    return result([]);
  }
  if(q.startsWith("SELECT p.id,p.sku,p.name,p.brand")){
    let items=state.products.filter(p=>p.is_active);
    if(q.includes("LEFT JOIN product_categories")){
      items=items.filter(p=>{
        const c=state.categories.find(c=>c.slug===p.category);
        const b=state.brands.find(b=>b.name.toLowerCase()===(p.brand||"").toLowerCase());
        return (!c||c.is_active)&&(!b||b.is_active);
      });
    }
    if(q.includes("WHERE p.sku=$1"))items=items.filter(p=>p.sku===args[0]);
    if(q.includes("WHERE p.id=$1"))items=items.filter(p=>p.id===args[0]);
    return result(items);
  }
  if(q.startsWith("SELECT id,sku,name,brand,model,description,price,stock,image_url,category,is_active FROM products"))
    return result(state.products);
  if(q.startsWith("INSERT INTO products(")){
    const sku=args[0];
    if(state.products.some(p=>p.sku===sku))throw Object.assign(Error("duplicate"),{code:"23505"});
    const id=state.nextProduct++;
    state.products.push({id,sku,name:args[1],brand:args[2],model:args[3],description:args[4],price:args[5],
      stock:args[6],image_url:args[7],category:args[8],is_active:args[9]});
    return result([{id}]);
  }
  if(q.startsWith("UPDATE products SET sku=$1")){
    const p=state.products.find(p=>p.id===args[10]);
    if(!p)return result([]);
    Object.assign(p,{sku:args[0],name:args[1],brand:args[2],model:args[3],description:args[4],
      price:args[5],stock:args[6],image_url:args[7],category:args[8],is_active:args[9]});
    return result([{id:p.id}]);
  }
  if(q.includes("FROM products WHERE sku = $1 FOR UPDATE"))
    return result(state.products.filter(p=>p.sku===args[0]));
  if(q.includes("AS category_hidden")&&q.includes("AS brand_hidden"))
    return result([{category_hidden:state.categories.some(c=>c.slug===args[0]&&!c.is_active),
      brand_hidden:state.brands.some(b=>b.name.toLowerCase()===(args[1]||"").toLowerCase()&&!b.is_active)}]);
  if(q.startsWith("INSERT INTO orders"))return result([{id:100,status:"pending",total:args[1],created_at:"2026-10-28"}]);
  if(q.startsWith("INSERT INTO order_items")||q.startsWith("UPDATE products SET stock = stock -"))return result([]);
  if(q.startsWith("INSERT INTO admin_notifications"))return result([]);
  throw Error("Unrecognized test SQL: "+q.slice(0,250));
}
const fakePool={query:async(sql,args)=>dbQuery(sql,args),connect:async()=>({
  query:async(sql,args)=>dbQuery(sql,args),release(){}
})};
const load=Module._load;
Module._load=function(request,parent,isMain){
  const parentName=parent?.filename||"";
  if(/[\\/]routes[\\/](store-taxonomy|products|admin|orders)\.js$/.test(parentName)&&request==="../db")return fakePool;
  if(/[\\/]routes[\\/](store-taxonomy|admin)\.js$/.test(parentName)&&request==="../middleware/requireAdmin")
    return (req,res,next)=>req.session?.user?.admin?next():res.status(403).json({message:"Admin only"});
  return load.call(this,request,parent,isMain);
};
let taxonomy,products,admin,orders;
try{
  taxonomy=require("../server/routes/store-taxonomy");
  products=require("../server/routes/products");
  admin=require("../server/routes/admin");
  orders=require("../server/routes/orders");
}finally{Module._load=load;}
const app=express();app.use(express.json());
app.use((req,res,next)=>{
  const uid=req.get("X-User");
  req.session=uid?{user:{id:Number(uid),admin:req.get("X-Admin")==="yes"}}:{};
  next();
});
app.use("/api/store-taxonomy",taxonomy);
app.use("/api/products",products);
app.use("/api/admin",admin);
app.use("/api/orders",orders);
let server,root;
test.before(async()=>{
  server=await new Promise(resolve=>{const s=app.listen(0,"127.0.0.1",()=>resolve(s));});
  root="http://127.0.0.1:"+server.address().port;
});
test.after(()=>new Promise(resolve=>server.close(resolve)));
test.beforeEach(()=>{state=setup();});
async function request(url,method,body,adminRole){
  return fetch(root+url,{
    method,headers:{"Content-Type":"application/json","X-User":"5",...(adminRole?{"X-Admin":"yes"}:{})},
    body:JSON.stringify(body)
  });
}
const categoryData={slug:"chargers",name_uk:"Зарядні пристрої",name_en:"Chargers",name_ru:"Зарядки",icon:"🔌",sort_order:99,is_active:true};
const newProduct={sku:"battery-new",name:"Батарейка AA",brand:"Anker",model:"AA",description:"Лужна батарейка",price:42,stock:11,image_url:"img/products/battery.webp",category:"batteries",is_active:true};

test("new taxonomy requires migration but old store products still load",async()=>{
  state.ready=false;
  const meta=await fetch(root+"/api/store-taxonomy/options");
  assert.equal(meta.status,503);
  const catalog=await (await fetch(root+"/api/products")).json();
  assert.equal(catalog.products.length,2);
  const blocked=await request("/api/store-taxonomy/admin/categories","POST",categoryData,true);
  assert.equal(blocked.status,503);
});
test("only administrators can create product types or brands",async()=>{
  assert.equal((await request("/api/store-taxonomy/admin/categories","POST",categoryData,false)).status,403);
  assert.equal((await request("/api/store-taxonomy/admin/brands","POST",{name:"JBL",is_active:true},false)).status,403);
  assert.equal((await request("/api/admin/products","POST",newProduct,false)).status,403);
  assert.equal((await request("/api/store-taxonomy/admin/categories","POST",{...categoryData,slug:"../../etc"},true)).status,400);
});
test("admin can create, rename and hide a category without deleting existing products",async()=>{
  const created=await request("/api/store-taxonomy/admin/categories","POST",categoryData,true);
  assert.equal(created.status,201);
  const updated=await request("/api/store-taxonomy/admin/categories/chargers","PUT",{
    name_uk:"Зарядки",name_en:"Chargers",name_ru:"Зарядные устройства",icon:"⚡",sort_order:85,is_active:false
  },true);
  assert.equal(updated.status,200);
  const c=state.categories.find(c=>c.slug==="chargers");
  assert.equal(c.name_uk,"Зарядки");
  assert.equal(c.is_active,false);
  const publicResult=await (await fetch(root+"/api/store-taxonomy/options")).json();
  assert.equal(publicResult.categories.some(c=>c.slug==="chargers"),false);
  assert.equal(state.products.length,2);
});
test("admin can add brand and brand rename updates current products in one transaction",async()=>{
  const create=await request("/api/store-taxonomy/admin/brands","POST",{name:"Panasonic",is_active:true},true);
  assert.equal(create.status,201);
  const updated=await request("/api/store-taxonomy/admin/brands/1","PUT",{name:"Sony Electronics",is_active:true},true);
  assert.equal(updated.status,200);
  assert.equal(state.products[0].brand,"Sony Electronics");
  assert.ok(state.operations.includes("BEGIN"));
  assert.ok(state.operations.includes("COMMIT"));
});
test("all types share product creation, inventory and SKU details",async()=>{
  const create=await request("/api/admin/products","POST",newProduct,true);
  assert.equal(create.status,201);
  const list=await (await fetch(root+"/api/products")).json();
  assert.ok(list.products.some(p=>p.sku==="battery-new"));
  const detail=await fetch(root+"/api/products/sku/battery-new");
  assert.equal(detail.status,200);
  assert.equal((await detail.json()).product.category,"batteries");
  const update=await request("/api/admin/products/50","PUT",{...newProduct,stock:0},true);
  assert.equal(update.status,200);
  assert.equal(state.products.find(x=>x.sku==="battery-new").stock,0);
  assert.equal((await request("/api/admin/products","POST",{...newProduct,sku:"forbidden",category:"unknown"},true)).status,400);
});
test("hiding a category or brand hides its products and blocks stale-cart checkout",async()=>{
  state.categories.find(c=>c.slug==="tv").is_active=false;
  const hidden=await (await fetch(root+"/api/products")).json();
  assert.equal(hidden.products.some(p=>p.sku==="remote001"),false);
  const checkout=await request("/api/orders","POST",{items:[{sku:"remote001",quantity:1}]},false);
  assert.equal(checkout.status,409);
  assert.equal(state.products[0].stock,3);
  state.categories.find(c=>c.slug==="tv").is_active=true;
  state.brands.find(b=>b.name==="Sony").is_active=false;
  const hiddenBrand=await (await fetch(root+"/api/products")).json();
  assert.equal(hiddenBrand.products.some(p=>p.sku==="remote001"),false);
  const checkout2=await request("/api/orders","POST",{items:[{sku:"remote001",quantity:1}]},false);
  assert.equal(checkout2.status,409);
});
test("migration is non-destructive and preserves old remote SKU/stock",()=>{
  const sql=fs.readFileSync(path.join(__dirname,"../server/sql/store-catalog-setup.sql"),"utf8");
  assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS product_categories"));
  assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS product_brands"));
  assert.ok(sql.includes("INSERT INTO product_brands(name)"));
  assert.ok(!/\bDROP\s+(?:TABLE|SCHEMA|DATABASE)\b/i.test(sql));
  assert.ok(!/\bTRUNCATE\b/i.test(sql));
  assert.ok(!/\bUPDATE\s+products\b/i.test(sql));
});
test("storefront is dynamic and has Ukrainian and English translations",()=>{
  const dir=path.resolve(__dirname,"../server/public");
  const catalog=fs.readFileSync(path.join(dir,"js/catalog.js"),"utf8");
  assert.ok(catalog.includes("/api/store-taxonomy/options"));
  assert.ok(!catalog.includes("data/pults.json"));
  assert.ok(catalog.includes("product.html?sku="));
  const html=fs.readFileSync(path.join(dir,"pults-shop.html"),"utf8");
  assert.ok(html.includes('id="catalogBrand"'));
  assert.ok(html.includes('id="catalogCategory"'));
  const source=fs.readFileSync(path.join(dir,"js/catalog-i18n.js"),"utf8");
  const dictionary=new Function("const window={addEventListener(){}};const document={readyState:'loading',addEventListener(){}};const localStorage={getItem(){return 'en';}};"+
    source+";return window.PultCatalogI18n.translations;")();
  for(const key of Object.keys(dictionary.uk)){
    assert.ok(dictionary.en[key],key+" en");
    assert.ok(dictionary.ru[key],key+" ru");
  }
  for(const match of html.matchAll(/data-store-(?:i18n|placeholder|aria)="([^"]+)"/g))
    assert.ok(dictionary.uk[match[1]],"Unknown storefront key "+match[1]);
});
