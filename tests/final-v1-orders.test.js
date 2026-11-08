"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const Module=require("node:module");
const express=require("express");
const result=rows=>({rows,rowCount:rows.length});
let data;
function reset(){
  data={products:[{id:11,sku:"test-remote",name:"Тестовий пульт",price:"429.00",stock:5,is_active:true,category:"tv",brand:"Sony"}],orders:[],items:[],history:[],notifications:[],nextId:100};
}
reset();
function query(sql,args=[]){
  const q=String(sql).replace(/\s+/g," ").trim();
  if(["BEGIN","COMMIT","ROLLBACK"].includes(q))return result([]);
  if(q.includes("to_regclass('product_categories')"))return result([{categories:false,brands:false}]);
  if(q.startsWith("SELECT id,status,total,created_at FROM orders WHERE user_id=$1 AND client_request_key=$2")){
    return result(data.orders.filter(o=>o.user_id===args[0]&&o.client_request_key===args[1]));
  }
  if(q.startsWith("SELECT id, name, price, stock, is_active, category, brand FROM products WHERE sku = $1 FOR UPDATE"))
    return result(data.products.filter(p=>p.sku===args[0]));
  if(q.startsWith("INSERT INTO orders ")){
    const order={id:data.nextId++,user_id:args[0],total:args[1],customer_name:args[2],customer_phone:args[3],
      customer_email:args[4],delivery_method:args[5],delivery_city:args[6],delivery_branch:args[7],
      customer_comment:args[8],client_request_key:args[9],status:"pending",stock_restored:false,created_at:"2026-11-08"};
    data.orders.push(order);return result([order]);
  }
  if(q.startsWith("INSERT INTO order_items ")){data.items.push({order_id:args[0],name:args[1],quantity:args[2],price:args[3],product_id:args[4]});return result([]);}
  if(q.startsWith("UPDATE products SET stock = stock - $1")){
    const p=data.products.find(x=>x.id===args[1]);p.stock-=args[0];return result([]);
  }
  if(q.startsWith("INSERT INTO admin_notifications ")){data.notifications.push(args);return result([]);}
  if(q==="SELECT role FROM users WHERE id = $1")return result([{role:args[0]===1?"admin":"user"}]);
  if(q.startsWith("SELECT id,status,stock_restored FROM orders WHERE id=$1 FOR UPDATE"))
    return result(data.orders.filter(o=>o.id===args[0]));
  if(q.startsWith("SELECT product_id,quantity FROM order_items WHERE order_id=$1"))
    return result(data.items.filter(i=>i.order_id===args[0]));
  if(q.startsWith("UPDATE products SET stock=stock+$1")){
    const p=data.products.find(x=>x.id===args[1]);if(!p)return result([]);
    p.stock+=args[0];return result([{id:p.id}]);
  }
  if(q.startsWith("UPDATE orders SET status='cancelled',stock_restored=TRUE WHERE id=$1")){
    const o=data.orders.find(o=>o.id===args[0]);o.status="cancelled";o.stock_restored=true;return result([]);
  }
  if(q.startsWith("UPDATE orders SET status=$1 WHERE id=$2")){
    const o=data.orders.find(o=>o.id===args[1]);o.status=args[0];return result([]);
  }
  if(q.startsWith("INSERT INTO order_status_history")){data.history.push(args);return result([]);}
  throw Error("Unknown SQL: "+q.slice(0,180));
}
const pool={query:async(sql,args)=>query(sql,args),connect:async()=>({query:async(sql,args)=>query(sql,args),release(){}})};
const original=Module._load;
Module._load=function(name,parent,isMain){
  if(name==="../db"&&/[/\\](?:routes|middleware)[/\\]/.test(parent?.filename||""))return pool;
  return original.call(this,name,parent,isMain);
};
let orderRoutes,adminRoutes;
try{orderRoutes=require("../server/routes/orders");adminRoutes=require("../server/routes/admin");}
finally{Module._load=original;}
const app=express();
app.use(express.json());
app.use((req,res,next)=>{
  const id=req.get("X-User");
  req.session={user:id?{id:Number(id)}:undefined};next();
});
app.use("/api/orders",orderRoutes);
app.use("/api/admin",adminRoutes);
let server,base;
test.before(async()=>{
  server=await new Promise(resolve=>{
    const s=app.listen(0,"127.0.0.1",()=>resolve(s));
  });
  base="http://127.0.0.1:"+server.address().port;
});
test.after(()=>new Promise(resolve=>server.close(resolve)));
test.beforeEach(reset);
const customer={name:"Іван Тест",phone:"+380501234567",email:"test@example.org",
  delivery_method:"ukrposhta",delivery_city:"Яготин",delivery_branch:"Індекс 07700",comment:"Не дзвоніть вночі"};
const key="f".repeat(36);
async function post(body,user=7){
  return fetch(base+"/api/orders",{method:"POST",
    headers:{"Content-Type":"application/json",...(user?{"X-User":String(user)}:{})},
    body:JSON.stringify(body)});
}
async function status(id,value,user=1){
  return fetch(base+"/api/admin/orders/"+id+"/status",{method:"PATCH",
    headers:{"Content-Type":"application/json","X-User":String(user)},
    body:JSON.stringify({status:value})});
}
test("v1 checkout validates and stores genuine buyer/delivery details; uses SERVER price",async()=>{
  const response=await post({items:[{sku:"test-remote",quantity:2,price:1}],customer,client_request_key:key});
  assert.equal(response.status,201);
  const saved=await response.json();
  assert.equal(saved.total,"858.00");
  assert.equal(data.products[0].stock,3);
  assert.equal(data.orders[0].customer_phone,customer.phone);
  assert.equal(data.orders[0].delivery_branch,customer.delivery_branch);
  assert.equal(data.orders[0].customer_comment,customer.comment);
  assert.equal(data.items[0].product_id,11);
});
test("a retry with the same checkout key does not create a second order or decrement stock",async()=>{
  const body={items:[{sku:"test-remote",quantity:1}],customer,client_request_key:key};
  assert.equal((await post(body)).status,201);
  const retry=await post(body);
  assert.equal(retry.status,200);
  assert.equal((await retry.json()).idempotent,true);
  assert.equal(data.orders.length,1);
  assert.equal(data.products[0].stock,4);
});
test("bad contact data and unauthenticated checkout are rejected without stock changes",async()=>{
  const bad=await post({items:[{sku:"test-remote",quantity:1}],customer:{...customer,phone:"?"}});
  assert.equal(bad.status,400);
  const noUser=await post({items:[{sku:"test-remote",quantity:1}],customer},null);
  assert.equal(noUser.status,401);
  assert.equal(data.products[0].stock,5);
});
test("admin cancellation restores stock once and logs the status",async()=>{
  const saved=await (await post({items:[{sku:"test-remote",quantity:2}],customer})).json();
  assert.equal(data.products[0].stock,3);
  assert.equal((await status(saved.id,"cancelled")).status,200);
  assert.equal(data.products[0].stock,5);
  assert.equal(data.orders[0].stock_restored,true);
  assert.equal(data.history.length,1);
  assert.equal((await status(saved.id,"cancelled")).status,200);
  assert.equal(data.products[0].stock,5);
  assert.equal(data.history.length,1);
  assert.equal((await status(saved.id,"processing")).status,409);
  assert.equal(data.products[0].stock,5);
});
test("shipped orders cannot be silently cancelled and restocked",async()=>{
  const saved=await (await post({items:[{sku:"test-remote",quantity:1}],customer})).json();
  assert.equal((await status(saved.id,"shipped")).status,200);
  assert.equal((await status(saved.id,"cancelled")).status,409);
  assert.equal(data.products[0].stock,4);
});
test("legacy orders missing product IDs require manual inventory reconciliation",async()=>{
  const saved=await (await post({items:[{sku:"test-remote",quantity:1}],customer})).json();
  data.items[0].product_id=null;
  const reply=await status(saved.id,"cancelled");
  assert.equal(reply.status,409);
  assert.equal(data.products[0].stock,4);
  assert.equal(data.orders[0].status,"pending");
});
test("ordinary customer cannot alter admin order status",async()=>{
  const saved=await (await post({items:[{sku:"test-remote",quantity:1}],customer})).json();
  const reply=await status(saved.id,"cancelled",7);
  assert.equal(reply.status,403);
  assert.equal(data.products[0].stock,4);
});
test("final schema is additive, retains historical data, includes durable sessions and order audit",()=>{
  const sql=fs.readFileSync(path.join(__dirname,"../server/sql/final-v1-setup.sql"),"utf8");
  for(const required of ["customer_phone","delivery_method","customer_comment","stock_restored",
    "product_id INTEGER","pult_sessions","pult_auth_attempts","order_status_history"]){
    assert.ok(sql.includes(required),required);
  }
  assert.doesNotMatch(sql,/^\s*(?:DROP TABLE|TRUNCATE|DELETE FROM orders|DELETE FROM users)\b/im);
});
