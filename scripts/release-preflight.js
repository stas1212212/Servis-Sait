"use strict";
// Read-only PULT+ v1 launch audit: never prints credentials or customer details.
const fs=require("node:fs");
const path=require("node:path");
const localEnv=path.resolve(__dirname,"../server/.env");
if(fs.existsSync(localEnv)&&typeof process.loadEnvFile==="function")process.loadEnvFile(localEnv);
const pool=require("../server/db");
let failures=0,warnings=0;
const log=(level,message)=>{
  console.log("["+level+"] "+message);
  if(level==="BLOCK")failures++;
  if(level==="CHECK")warnings++;
};
const required={
  users:["id","role","auth_version"],
  orders:["id","user_id","status","total","customer_name","customer_phone","customer_email","delivery_method","delivery_city","delivery_branch","customer_comment","stock_restored","client_request_key"],
  order_items:["order_id","product_id","quantity","price"],
  products:["id","sku","name","price","stock","image_url","is_active"],
  service_requests:["id","tracking_code","user_id"],
  site_settings:["key","value"],
  admin_notifications:["id"],
  password_reset_tokens:["user_id"],
  repair_reviews:["id"],
  product_categories:["slug","is_active"],
  product_brands:["name","is_active"],
  repair_shipments:["carrier","tracking_number"],
  repair_send_instructions:["carrier","recipient_name"],
  shipping_carrier_locations:["carrier","city","warehouse","address","latitude","longitude"],
  repair_delivery_tokens:["service_request_id"],
  pult_sessions:["sid","sess","expires_at"],
  pult_auth_attempts:["attempt_key","count","expires_at"],
  order_status_history:["order_id","new_status"]
};
async function main(){
  console.log("PULT+ v1.0 — read-only release readiness audit");
  if(process.env.NODE_ENV==="production"&&(!process.env.SESSION_SECRET||(process.env.SESSION_SECRET.length<32||/replace_with|CHANGE_LATER|PULT_PLUS_DEV/i.test(process.env.SESSION_SECRET))))
    log("BLOCK","Set a private, randomly generated SESSION_SECRET of at least 32 characters.");
  else if(!process.env.SESSION_SECRET||/replace_with|CHANGE_LATER|PULT_PLUS_DEV/i.test(process.env.SESSION_SECRET))
    log("CHECK","Replace the development SESSION_SECRET before public hosting.");
  if(process.env.NODE_ENV==="production"&&!/^https:\/\//.test(process.env.PUBLIC_BASE_URL||""))
    log("BLOCK","PUBLIC_BASE_URL must be an HTTPS URL on production.");
  if(!process.env.RESEND_API_KEY||!process.env.MAIL_FROM)
    log("CHECK","Password-reset email is disabled. Configure RESEND_API_KEY and verified MAIL_FROM before launch.");
  const cols=await pool.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema=current_schema()");
  const byTable=new Map();
  for(const row of cols.rows){
    if(!byTable.has(row.table_name))byTable.set(row.table_name,new Set());
    byTable.get(row.table_name).add(row.column_name);
  }
  for(const [table,fields] of Object.entries(required)){
    if(!byTable.has(table)){log("BLOCK","Database table missing: "+table);continue;}
    const missing=fields.filter(f=>!byTable.get(table).has(f));
    if(missing.length)log("BLOCK","Table "+table+" missing columns: "+missing.join(", "));
  }
  if(failures){
    log("CHECK","Restore/backup service_shop and apply SQL migrations in the documented order, then rerun.");
    return;
  }
  log("OK","Core database schema and final release migrations are present.");
  const settings=await pool.query("SELECT key,value FROM site_settings");
  const set=Object.fromEntries(settings.rows.map(x=>[x.key,String(x.value||"").trim()]));
  for(const [key,label] of [
    ["business_name","Official business/merchant name"],
    ["business_registration","Merchant registration details"],
    ["phone","Business phone"],["email","Business contact email"],
    ["address","Real service address"],["business_hours","Working hours"]
  ]){
    if(!set[key])log("BLOCK","Public business information missing: "+label);
  }
  if(!failures)log("OK","Business identity and required contacts are filled.");
  const admin=await pool.query("SELECT COUNT(*)::int AS value FROM users WHERE role='admin'");
  if(!admin.rows[0]?.value)log("BLOCK","No database user has the admin role.");
  const photoRows=await pool.query("SELECT sku,image_url FROM products WHERE is_active=TRUE LIMIT 500");
  if(!photoRows.rows.length)log("CHECK","No active products. Load only real inventory before enabling sales.");
  const missingPhotos=photoRows.rows.filter(p=>{
    if(!p.image_url)return true;
    const url=String(p.image_url).replace(/^\/+/,"");
    if(!/^(?:img|png)\/[a-zA-Z0-9/_-]+\.(?:png|jpe?g|avif|webp)$/i.test(url))return true;
    const file=path.resolve(__dirname,"../server/public",url);
    return !file.startsWith(path.resolve(__dirname,"../server/public")+path.sep)||!fs.existsSync(file);
  });
  if(missingPhotos.length)log("CHECK",missingPhotos.length+" active product(s) have no accessible local photo. Verify real images and prices before launch.");
  const carriers=await pool.query("SELECT carrier,recipient_name,recipient_phone,city,warehouse,address,latitude,longitude FROM shipping_carrier_locations");
  for(const carrier of ["nova_poshta","ukrposhta"]){
    const d=carriers.rows.find(x=>x.carrier===carrier);
    if(!d||![d.recipient_name,d.recipient_phone,d.city,d.warehouse,d.address].every(x=>!!String(x||"").trim())||d.latitude==null||d.longitude==null)
      log("BLOCK","Destination not fully configured for "+carrier+" (admin-shipping.html).");
  }
  const legacy=await pool.query("SELECT COUNT(*)::int AS value FROM order_items WHERE product_id IS NULL");
  if(legacy.rows[0]?.value)log("CHECK",legacy.rows[0].value+" legacy order item(s) lack product IDs; cancelling such orders requires manual inventory reconciliation.");
  log("CHECK","Verify database backup RESTORE, HTTPS, checkout, login, repair shipping, legal details and real-browser testing manually.");
}
main().catch(error=>{
  console.error("[BLOCK] Release preflight failed:",error.code||error.message);
  process.exitCode=1;
}).finally(async()=>{
  await pool.end().catch(()=>{});
  console.log("Read-only check finished. BLOCK="+failures+" CHECK="+warnings);
  if(failures)process.exitCode=1;
});
