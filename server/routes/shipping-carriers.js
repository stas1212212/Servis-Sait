"use strict";
// Carrier selection and Google Maps destinations for PULT+ repairs.
// A publicly visible branch is NOT equivalent to permission to send a parcel.
const express=require("express");
const crypto=require("node:crypto");
const pool=require("../db");
const requireAdmin=require("../middleware/requireAdmin");
const router=express.Router();
const CARRIERS=new Set(["nova_poshta","ukrposhta"]);
const MIGRATION="Адміністратор має виконати server/sql/carrier-choice-map.sql у pgAdmin.";
const CUSTOMER_UNAVAILABLE="Адреса відділення тимчасово недоступна. Дочекайтеся підтвердження від менеджера PULT+ або зв’яжіться з нами. Не відправляйте пристрій до отримання реквізитів.";
const adminRequest=req=>req.path==="/admin"||req.path.startsWith("/admin/");
const publicFields="carrier,city,warehouse,address,latitude,longitude";
const allFields=publicFields+",recipient_name,recipient_phone";

function parseCarrier(raw){return typeof raw==="string"&&CARRIERS.has(raw)?raw:null;}
function validId(raw){const n=Number(raw);return Number.isSafeInteger(n)&&n>0?n:null;}
function originGuard(req,res,next){
  const origin=req.get("origin");
  const source=req.get("sec-fetch-site");
  if((origin&&origin!==req.protocol+"://"+req.get("host"))||
    (source&&source!=="same-origin"&&source!=="none"))
    return res.status(403).json({message:"Недозволене джерело запиту"});
  if(!req.is("application/json"))
    return res.status(415).json({message:"Очікується JSON"});
  next();
}
function errorReply(res,error,label){
  console.error(label,error);
  if(error?.code==="42P01"||error?.code==="42703")return res.status(503).json({message:adminRequest(res.req)?MIGRATION:CUSTOMER_UNAVAILABLE});
  return res.status(500).json({message:"Сервіс доставки тимчасово недоступний"});
}
async function schema(req,res,next){
  try{
    const check=await pool.query(
      "SELECT to_regclass('shipping_carrier_locations') IS NOT NULL AS locations, to_regclass('repair_delivery_tokens') IS NOT NULL AS tokens");
    if(!check.rows[0]?.locations||!check.rows[0]?.tokens)return res.status(503).json({message:adminRequest(req)?MIGRATION:CUSTOMER_UNAVAILABLE});
    next();
  }catch(error){errorReply(res,error,"Carrier schema");}
}
function settings(body){
  if(!body||typeof body!=="object"||Array.isArray(body))return null;
  const fields={recipient_name:120,recipient_phone:30,city:120,warehouse:180,address:240};
  const result={};
  for(const [name,max] of Object.entries(fields)){
    const raw=body[name];
    if(typeof raw!=="string"||raw.length>max*2)return null;
    result[name]=raw.trim();
    if(result[name].length>max)return null;
  }
  const lat=body.latitude,lon=body.longitude;
  const blank=x=>x==null||x==="";
  if(blank(lat)!==blank(lon))return null;
  result.latitude=blank(lat)?null:Number(lat);
  result.longitude=blank(lon)?null:Number(lon);
  if(result.latitude!==null&&(!Number.isFinite(result.latitude)||result.latitude < -90||result.latitude>90||
    !Number.isFinite(result.longitude)||result.longitude < -180||result.longitude>180))return null;
  return result;
}
async function authorized(client,repair,req){
  const userId=req.session?.user?.id;
  if(userId&&repair.user_id!==null&&Number(userId)===Number(repair.user_id))return true;
  const raw=req.get("x-pult-delivery-key");
  if(typeof raw!=="string"||!/^[a-f0-9]{64}$/.test(raw))return false;
  const hash=crypto.createHash("sha256").update(raw).digest("hex");
  const result=await client.query(
    "SELECT 1 FROM repair_delivery_tokens WHERE service_request_id=$1 AND token_hash=$2 AND created_at>NOW()-INTERVAL '90 days'",
    [repair.id,hash]);
  return result.rowCount>0;
}
router.use(schema);

// Public *branch* location only. No person's name/phone, no RP lookup.
router.get("/locations",async(req,res)=>{
  try{
    const result=await pool.query("SELECT "+publicFields+" FROM shipping_carrier_locations ORDER BY carrier");
    const locations=result.rows.map(x=>({
      carrier:x.carrier,
      configured:!!(x.city&&x.warehouse&&x.address&&x.latitude!==null&&x.longitude!==null),
      city:x.city||"",warehouse:x.warehouse||"",address:x.address||"",
      latitude:x.latitude==null?null:Number(x.latitude),longitude:x.longitude==null?null:Number(x.longitude)
    }));
    res.json({locations});
  }catch(error){errorReply(res,error,"Public carrier locations");}
});

router.get("/request/:id",async(req,res)=>{
  const id=validId(req.params.id);
  if(!id)return res.status(400).json({message:"Невірний номер заявки"});
  try{
    const result=await pool.query("SELECT id,user_id,status,tracking_code FROM service_requests WHERE id=$1",[id]);
    if(!result.rowCount)return res.status(404).json({message:"Заявку не знайдено"});
    const repair=result.rows[0];
    if(!await authorized(pool,repair,req))return res.status(403).json({message:"Увійдіть у свій акаунт або відкрийте підтвердження у вкладці, де створили заявку"});
    const [incoming,approved]=await Promise.all([
      pool.query("SELECT carrier,status,tracking_number FROM repair_shipments WHERE service_request_id=$1 AND direction='incoming'",[id]),
      pool.query("SELECT carrier,recipient_name,recipient_phone,city,warehouse,address,latitude,longitude,approved_at FROM repair_send_instructions WHERE service_request_id=$1",[id])
    ]);
    res.json({
      id:repair.id,tracking_code:repair.tracking_code,
      carrier:incoming.rows[0]?.carrier||null,
      shipment_status:incoming.rows[0]?.status||null,
      can_change:repair.status!=="cancelled"&&(!incoming.rowCount ||
        (!incoming.rows[0].tracking_number&&incoming.rows[0].status==="not_sent")),
      send_to:approved.rows[0]||null
    });
  }catch(error){errorReply(res,error,"Carrier request detail");}
});

router.put("/request/:id",originGuard,async(req,res)=>{
  const id=validId(req.params.id),carrier=parseCarrier(req.body?.carrier);
  if(!id||!carrier)return res.status(400).json({message:"Оберіть Нову пошту або Укрпошту"});
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const result=await client.query("SELECT id,user_id,name,phone,status FROM service_requests WHERE id=$1 FOR UPDATE",[id]);
    if(!result.rowCount){await client.query("ROLLBACK");return res.status(404).json({message:"Заявку не знайдено"});}
    const repair=result.rows[0];
    if(!await authorized(client,repair,req)){await client.query("ROLLBACK");return res.status(403).json({message:"Немає права змінювати доставку цієї заявки"});}
    if(repair.status==="cancelled"){await client.query("ROLLBACK");return res.status(409).json({message:"Заявку скасовано"});}
    const legs=await client.query("SELECT direction,carrier,status,tracking_number,city,warehouse FROM repair_shipments WHERE service_request_id=$1 FOR UPDATE",[id]);
    if(legs.rows.some(x=>x.tracking_number||x.status!=="not_sent")){
      await client.query("ROLLBACK");
      return res.status(409).json({message:"Відправлення вже оформлюється. Змінити перевізника може лише менеджер"});
    }
    const old=legs.rows.find(x=>x.direction==="incoming")?.carrier||null;
    if(old!==carrier){
      // Approved information becomes invalid when the carrier changes.
      await client.query("DELETE FROM repair_send_instructions WHERE service_request_id=$1",[id]);
      // Only the *incoming* service changes on the confirmation page.
      // A customer-selected return carrier and destination must remain intact.
      await client.query("UPDATE repair_shipments SET carrier=$2,city='',warehouse='',updated_at=NOW() WHERE service_request_id=$1 AND direction='incoming'",[id,carrier]);
      const outgoing=legs.rows.find(x=>x.direction==="outgoing");
      if(outgoing&&outgoing.carrier===old&&!outgoing.city&&!outgoing.warehouse){
        // Older repairs without a return destination default to the incoming carrier.
        await client.query("UPDATE repair_shipments SET carrier=$2,updated_at=NOW() WHERE service_request_id=$1 AND direction='outgoing'",[id,carrier]);
      }
    }
    if(!legs.rows.some(x=>x.direction==="incoming"))
      await client.query("INSERT INTO repair_shipments(service_request_id,direction,carrier) VALUES($1,'incoming',$2)",[id,carrier]);
    if(!legs.rows.some(x=>x.direction==="outgoing"))
      await client.query("INSERT INTO repair_shipments(service_request_id,direction,carrier,recipient_name,recipient_phone) VALUES($1,'outgoing',$2,$3,$4)",[id,carrier,repair.name,repair.phone]);
    await client.query("COMMIT");
    res.json({carrier,message:"Перевізника збережено для заявки. Чекайте підтвердження одержувача менеджером"});
  }catch(error){await client.query("ROLLBACK").catch(()=>{});errorReply(res,error,"Carrier selection");}
  finally{client.release();}
});

// Only admins can see/store the individual's contact information.
router.get("/admin/locations",requireAdmin,async(req,res)=>{
  try{
    const result=await pool.query("SELECT "+allFields+" FROM shipping_carrier_locations ORDER BY carrier");
    res.json({locations:result.rows});
  }catch(error){errorReply(res,error,"Carrier admin locations");}
});
router.put("/admin/locations/:carrier",requireAdmin,originGuard,async(req,res)=>{
  const carrier=parseCarrier(req.params.carrier),value=settings(req.body);
  if(!carrier||!value)return res.status(400).json({message:"Перевірте реквізити та координати відділення"});
  try{
    await pool.query(
      "INSERT INTO shipping_carrier_locations(carrier,recipient_name,recipient_phone,city,warehouse,address,latitude,longitude) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(carrier) DO UPDATE SET recipient_name=EXCLUDED.recipient_name,recipient_phone=EXCLUDED.recipient_phone,city=EXCLUDED.city,warehouse=EXCLUDED.warehouse,address=EXCLUDED.address,latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,updated_at=NOW()",
      [carrier,value.recipient_name,value.recipient_phone,value.city,value.warehouse,value.address,value.latitude,value.longitude]);
    res.json({message:"Реквізити відділення збережено. Контакти фізичної особи залишаються приватними"});
  }catch(error){errorReply(res,error,"Carrier admin save");}
});

// Admin approval uses the selected carrier, with a per-repair snapshot.
// The two legacy NP-only approval endpoints are kept for earlier installations.
router.put("/admin/requests/:id/approve",requireAdmin,originGuard,async(req,res)=>{
  const id=validId(req.params.id),approve=req.body?.approve;
  if(!id||typeof approve!=="boolean")return res.status(400).json({message:"Вкажіть заявку та рішення"});
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const request=await client.query("SELECT id,status FROM service_requests WHERE id=$1 FOR UPDATE",[id]);
    if(!request.rowCount){await client.query("ROLLBACK");return res.status(404).json({message:"Заявку не знайдено"});}
    if(request.rows[0].status==="cancelled"){await client.query("ROLLBACK");return res.status(409).json({message:"Заявку скасовано"});}
    const incoming=await client.query("SELECT carrier,status,tracking_number FROM repair_shipments WHERE service_request_id=$1 AND direction='incoming' FOR UPDATE",[id]);
    if(!incoming.rowCount){await client.query("ROLLBACK");return res.status(409).json({message:"Клієнт ще не обрав перевізника"});}
    if(incoming.rows[0].tracking_number||incoming.rows[0].status!=="not_sent"){
      await client.query("ROLLBACK");return res.status(409).json({message:"Відправлення вже обробляється. Реквізити змінюйте особисто з клієнтом"});
    }
    let record=null;
    if(approve){
      const value=await client.query("SELECT "+allFields+" FROM shipping_carrier_locations WHERE carrier=$1",[incoming.rows[0].carrier]);
      const item=value.rows[0];
      if(!item||![item.recipient_name,item.recipient_phone,item.city,item.warehouse,item.address].every(x=>typeof x==="string"&&x.trim())||
         item.latitude==null||item.longitude==null){
        await client.query("ROLLBACK");
        return res.status(409).json({message:"Заповніть ПІБ, телефон, точну адресу та координати вибраного відділення"});
      }
      const saved=await client.query(
        "INSERT INTO repair_send_instructions(service_request_id,recipient_name,recipient_phone,city,warehouse,carrier,address,latitude,longitude,approved_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(service_request_id) DO UPDATE SET recipient_name=EXCLUDED.recipient_name,recipient_phone=EXCLUDED.recipient_phone,city=EXCLUDED.city,warehouse=EXCLUDED.warehouse,carrier=EXCLUDED.carrier,address=EXCLUDED.address,latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,approved_by=EXCLUDED.approved_by,approved_at=NOW() RETURNING service_request_id,recipient_name,recipient_phone,city,warehouse,carrier,address,latitude,longitude,approved_at",
        [id,item.recipient_name,item.recipient_phone,item.city,item.warehouse,item.carrier,item.address,item.latitude,item.longitude,req.session.user.id]);
      record=saved.rows[0];
    }else await client.query("DELETE FROM repair_send_instructions WHERE service_request_id=$1",[id]);
    await client.query("COMMIT");
    res.json({send_to:record,message:approve?"Реквізити підтверджено для цієї заявки":"Підтвердження відкликано"});
  }catch(error){await client.query("ROLLBACK").catch(()=>{});errorReply(res,error,"Carrier approval");}
  finally{client.release();}
});
module.exports=router;
