"use strict";
const express = require("express");
const pool = require("../db");
const requireAdmin = require("../middleware/requireAdmin");
const {isTtn,parseShipment,parseRecipient,parseReturnPreference,parseIntake,numericId,stringField}=require("../shipping-utils");
const router=express.Router();
const MISSING="Модуль доставки ще не налаштовано. Адміністратор має виконати server/sql/shipping-setup.sql.";
const LIMIT=100;

async function available() {
  const result=await pool.query("SELECT to_regclass('repair_shipments') IS NOT NULL AS shipments, to_regclass('repair_intakes') IS NOT NULL AS intakes, to_regclass('shipping_recipient_settings') IS NOT NULL AS recipient");
  return Object.values(result.rows[0]).every(Boolean);
}
async function requireSchema(req,res,next) {
  try {if(!await available())return res.status(503).json({message:MISSING});next();}
  catch(error){console.error("Shipping schema check:",error);res.status(503).json({message:"Сервіс доставки тимчасово недоступний"});}
}
function requireUser(req,res,next) {
  if(!req.session?.user?.id)return res.status(401).json({message:"Увійдіть в особистий кабінет"});
  next();
}
function writeGuard(req,res,next) {
  const origin=req.get("origin");
  if(origin && origin!==req.protocol+"://"+req.get("host"))return res.status(403).json({message:"Заборонене джерело запиту"});
  if(!req.is("application/json"))return res.status(415).json({message:"Очікується JSON"});
  next();
}
function fail(res,error,label) {
  console.error(label,error);
  if(error?.code==="23505")return res.status(409).json({message:"Така ТТН вже вказана для іншого відправлення"});
  if(error?.code==="42P01"||error?.code==="42703")return res.status(503).json({message:"Запустіть оновлений server/sql/shipping-setup.sql у pgAdmin, потім повторіть дію"});
  return res.status(500).json({message:"Не вдалося зберегти дані доставки"});
}
function groupedShipments(rows) {
  const result={};
  for(const item of rows) {
    if(!result[item.service_request_id])result[item.service_request_id]={};
    result[item.service_request_id][item.direction]=item;
  }
  return result;
}

async function loadApprovedInstructions(ids) {
  // Backwards-compatible until the repeatable shipping-setup.sql is applied.
  const check=await pool.query("SELECT to_regclass('repair_send_instructions') IS NOT NULL AS installed");
  if(!check.rows[0]?.installed || !ids.length)return {installed:!!check.rows[0]?.installed,records:new Map()};
  const rows=await pool.query(
    "SELECT service_request_id,recipient_name,recipient_phone,city,warehouse,approved_at FROM repair_send_instructions WHERE service_request_id=ANY($1::int[])",
    [ids]);
  return {installed:true,records:new Map(rows.rows.map(item=>[item.service_request_id,item]))};
}

// Readiness only. Never expose private recipient data publicly.
router.get("/availability",async(req,res)=>{
  try{res.json({ready:await available(),carrier:"nova_poshta",mode:"manual"});}
  catch(error){console.error("Shipping availability:",error);res.status(503).json({ready:false});}
});
router.use(requireSchema);

router.get("/mine",requireUser,async(req,res)=>{
  try {
    const repairs=await pool.query("SELECT id,tracking_code,device_type,brand,model,status,created_at FROM service_requests WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT $2",[req.session.user.id,LIMIT]);
    const ids=repairs.rows.map(r=>r.id);
    if(!ids.length)return res.json({repairs:[]});
    const shipments=await pool.query("SELECT service_request_id,direction,carrier,tracking_number,status,city,warehouse,updated_at FROM repair_shipments WHERE service_request_id=ANY($1::int[])",[ids]);
    const intakes=await pool.query("SELECT service_request_id,received_at FROM repair_intakes WHERE service_request_id=ANY($1::int[])",[ids]);
    const byId=groupedShipments(shipments.rows);
    const intakeId=new Map(intakes.rows.map(x=>[x.service_request_id,x.received_at]));
    const instructions=await loadApprovedInstructions(ids);
    res.json({repairs:repairs.rows.map(r=>({...r,shipments:byId[r.id]||{},
      received_at:intakeId.get(r.id)||null,send_to:instructions.records.get(r.id)||null}))});
  }catch(error){fail(res,error,"Shipping /mine");}
});

router.put("/mine/:id/incoming",requireUser,writeGuard,async(req,res)=>{
  const id=numericId(req.params.id);
  const tracking_number=stringField(req.body?.tracking_number,14);
  if(!id||!isTtn(tracking_number))return res.status(400).json({message:"Вкажіть 14 цифр ТТН Нової пошти"});
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    const owner=await client.query("SELECT id,status FROM service_requests WHERE id=$1 AND user_id=$2 FOR UPDATE",[id,req.session.user.id]);
    if(!owner.rowCount){await client.query("ROLLBACK");return res.status(404).json({message:"Заявку не знайдено"});}
    if(owner.rows[0].status==="cancelled"){await client.query("ROLLBACK");return res.status(409).json({message:"Заявку скасовано"});}
    const prev=await client.query("SELECT status FROM repair_shipments WHERE service_request_id=$1 AND direction='incoming' FOR UPDATE",[id]);
    if(prev.rowCount&&!["not_sent","registered"].includes(prev.rows[0].status)){await client.query("ROLLBACK");return res.status(409).json({message:"Відправлення вже обробляється сервісом. Зверніться до адміністратора"});}
    await client.query("INSERT INTO repair_shipments(service_request_id,direction,tracking_number,status) VALUES($1,'incoming',$2,'registered') ON CONFLICT(service_request_id,direction) DO UPDATE SET tracking_number=EXCLUDED.tracking_number,status='registered',updated_at=NOW()",[id,tracking_number]);
    await client.query("COMMIT");
    res.json({message:"Вхідну ТТН збережено"});
  }catch(error){await client.query("ROLLBACK").catch(()=>{});fail(res,error,"Client incoming TTN");}
  finally{client.release();}
});
router.put("/mine/:id/return",requireUser,writeGuard,async(req,res)=>{
  const id=numericId(req.params.id),preference=parseReturnPreference(req.body);
  if(!id||!preference)return res.status(400).json({message:"Вкажіть місто і відділення для повернення"});
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const owner=await client.query("SELECT id,status,name,phone FROM service_requests WHERE id=$1 AND user_id=$2 FOR UPDATE",[id,req.session.user.id]);
    if(!owner.rowCount){await client.query("ROLLBACK");return res.status(404).json({message:"Заявку не знайдено"});}
    if(owner.rows[0].status==="cancelled"){await client.query("ROLLBACK");return res.status(409).json({message:"Заявку скасовано"});}
    const prev=await client.query("SELECT status FROM repair_shipments WHERE service_request_id=$1 AND direction='outgoing' FOR UPDATE",[id]);
    if(prev.rowCount&&prev.rows[0].status!=="not_sent"){await client.query("ROLLBACK");return res.status(409).json({message:"Зворотну посилку вже оформлюють. Зверніться до сервісу"});}
    await client.query("INSERT INTO repair_shipments(service_request_id,direction,city,warehouse,recipient_name,recipient_phone) VALUES($1,'outgoing',$2,$3,$4,$5) ON CONFLICT(service_request_id,direction) DO UPDATE SET city=EXCLUDED.city,warehouse=EXCLUDED.warehouse,updated_at=NOW()",[id,preference.return_city,preference.return_warehouse,owner.rows[0].name,owner.rows[0].phone]);
    await client.query("COMMIT");
    res.json({message:"Відділення для повернення збережено"});
  }catch(error){await client.query("ROLLBACK").catch(()=>{});fail(res,error,"Client return branch");}
  finally{client.release();}
});

router.use("/admin",requireAdmin);
router.get("/admin/recipient",async(req,res)=>{
  try{
    const result=await pool.query("SELECT full_name,phone,city,warehouse,updated_at FROM shipping_recipient_settings WHERE id=1");
    res.json({recipient:result.rows[0]||{}});
  }catch(error){fail(res,error,"Shipping admin recipient");}
});
router.put("/admin/recipient",writeGuard,async(req,res)=>{
  const recipient=parseRecipient(req.body);
  if(!recipient)return res.status(400).json({message:"Перевірте реквізити одержувача"});
  try{
    await pool.query("INSERT INTO shipping_recipient_settings(id,full_name,phone,city,warehouse) VALUES(1,$1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET full_name=EXCLUDED.full_name,phone=EXCLUDED.phone,city=EXCLUDED.city,warehouse=EXCLUDED.warehouse,updated_at=NOW()",[recipient.full_name,recipient.phone,recipient.city,recipient.warehouse]);
    res.json({message:"Реквізити одержувача збережено. Вони не публікуються у відкритих налаштуваннях сайту"});
  }catch(error){fail(res,error,"Shipping admin recipient save");}
});
router.get("/admin/repairs",async(req,res)=>{
  try{
    const repairs=await pool.query("SELECT id,tracking_code,name,phone,email,device_type,brand,model,status,created_at FROM service_requests ORDER BY created_at DESC,id DESC LIMIT $1",[LIMIT]);
    const ids=repairs.rows.map(x=>x.id);
    if(!ids.length)return res.json({repairs:[]});
    const shipments=await pool.query("SELECT service_request_id,direction,tracking_number,status,city,warehouse,recipient_name,recipient_phone,updated_at FROM repair_shipments WHERE service_request_id=ANY($1::int[])",[ids]);
    const intakes=await pool.query("SELECT service_request_id,external_condition,accessories,serial_number,notes,received_at,updated_at FROM repair_intakes WHERE service_request_id=ANY($1::int[])",[ids]);
    const byId=groupedShipments(shipments.rows);
    const intakeMap=new Map(intakes.rows.map(x=>[x.service_request_id,x]));
    const instructions=await loadApprovedInstructions(ids);
    res.json({instructions_ready:instructions.installed,repairs:repairs.rows.map(r=>({...r,shipments:byId[r.id]||{},
      intake:intakeMap.get(r.id)||null,send_to:instructions.records.get(r.id)||null}))});
  }catch(error){fail(res,error,"Shipping admin repairs");}
});

/*
 * Staff approves a snapshot for ONE repair. Global physical-person details
 * are never published in public settings or the RP tracking endpoint.
 * Repair ownership is verified in the /mine query before send_to is returned.
 */
router.put("/admin/repairs/:id/instructions",writeGuard,async(req,res)=>{
  const id=numericId(req.params.id),approve=req.body?.approve;
  if(!id||typeof approve!=="boolean")return res.status(400).json({message:"Вкажіть заявку та підтвердження"});
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const request=await client.query("SELECT id,status FROM service_requests WHERE id=$1 FOR UPDATE",[id]);
    if(!request.rowCount){await client.query("ROLLBACK");return res.status(404).json({message:"Заявку не знайдено"});}
    if(request.rows[0].status==="cancelled"){await client.query("ROLLBACK");return res.status(409).json({message:"Заявку скасовано"});}
    const shipment=await client.query(
      "SELECT id,status,tracking_number FROM repair_shipments WHERE service_request_id=$1 AND direction='incoming' FOR UPDATE",[id]);
    if(!shipment.rowCount){await client.query("ROLLBACK");return res.status(409).json({message:"Для цієї заявки не налаштована доставка Новою поштою"});}
    if(shipment.rows[0].tracking_number || !["not_sent","registered"].includes(shipment.rows[0].status)){
      await client.query("ROLLBACK");
      return res.status(409).json({message:"Посилку вже відправлено чи прийнято. Зміни адреси погоджуйте з клієнтом вручну"});
    }
    let instruction=null;
    if(approve){
      const recipient=await client.query("SELECT full_name,phone,city,warehouse FROM shipping_recipient_settings WHERE id=1");
      const p=recipient.rows[0];
      if(!p||![p.full_name,p.phone,p.city,p.warehouse].every(x=>typeof x==="string"&&x.trim())){
        await client.query("ROLLBACK");
        return res.status(409).json({message:"Спочатку вкажіть ПІБ, телефон, місто і відділення одержувача"});
      }
      const result=await client.query(
        "INSERT INTO repair_send_instructions(service_request_id,recipient_name,recipient_phone,city,warehouse,approved_by) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(service_request_id) DO UPDATE SET recipient_name=EXCLUDED.recipient_name,recipient_phone=EXCLUDED.recipient_phone,city=EXCLUDED.city,warehouse=EXCLUDED.warehouse,approved_by=EXCLUDED.approved_by,approved_at=NOW() RETURNING service_request_id,recipient_name,recipient_phone,city,warehouse,approved_at",
        [id,p.full_name.trim(),p.phone.trim(),p.city.trim(),p.warehouse.trim(),req.session.user.id]);
      instruction=result.rows[0];
    }else{
      await client.query("DELETE FROM repair_send_instructions WHERE service_request_id=$1",[id]);
    }
    await client.query("COMMIT");
    res.json({message:approve?"Реквізити підтверджено для цієї заявки":"Реквізити відкликано для цієї заявки",send_to:instruction});
  }catch(error){await client.query("ROLLBACK").catch(()=>{});fail(res,error,"Shipping approval");}
  finally{client.release();}
});

router.put("/admin/repairs/:id/:direction",writeGuard,async(req,res)=>{
  const id=numericId(req.params.id),direction=req.params.direction;
  const shipment=parseShipment(req.body,direction);
  if(!id||!shipment)return res.status(400).json({message:"Некоректні дані: ТТН — 14 цифр; перевірте статус, відділення та реквізити"});
  if(direction==="incoming"&&shipment.status==="received")return res.status(409).json({message:"Прийняття посилки виконується через акт приймання нижче"});
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const repair=await client.query("SELECT id,status FROM service_requests WHERE id=$1 FOR UPDATE",[id]);
    if(!repair.rowCount){await client.query("ROLLBACK");return res.status(404).json({message:"Заявку не знайдено"});}
    if(shipment.status!=="not_sent"&&shipment.status!=="cancelled"&&repair.rows[0].status==="cancelled"){await client.query("ROLLBACK");return res.status(409).json({message:"Заявку скасовано"});}
    if(direction==="outgoing"&&!["not_sent","cancelled"].includes(shipment.status)&&repair.rows[0].status!=="completed"){await client.query("ROLLBACK");return res.status(409).json({message:"Для зворотної відправки спочатку завершіть ремонт"});}
    const existing=await client.query("SELECT status FROM repair_shipments WHERE service_request_id=$1 AND direction=$2 FOR UPDATE",[id,direction]);
    if(existing.rowCount&&existing.rows[0].status==="received"&&shipment.status!=="received"){await client.query("ROLLBACK");return res.status(409).json({message:"Отримане відправлення не можна перевести назад"});}
    await client.query("INSERT INTO repair_shipments(service_request_id,direction,tracking_number,status,city,warehouse,recipient_name,recipient_phone) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(service_request_id,direction) DO UPDATE SET tracking_number=EXCLUDED.tracking_number,status=EXCLUDED.status,city=EXCLUDED.city,warehouse=EXCLUDED.warehouse,recipient_name=EXCLUDED.recipient_name,recipient_phone=EXCLUDED.recipient_phone,updated_at=NOW()",[id,direction,shipment.tracking_number,shipment.status,shipment.city,shipment.warehouse,shipment.recipient_name,shipment.recipient_phone]);
    await client.query("COMMIT");
    res.json({message:"Відправлення оновлено"});
  }catch(error){await client.query("ROLLBACK").catch(()=>{});fail(res,error,"Shipping admin update");}
  finally{client.release();}
});
router.put("/admin/repairs/:id/intake",writeGuard,async(req,res)=>{
  const id=numericId(req.params.id),intake=parseIntake(req.body);
  if(!id||!intake)return res.status(400).json({message:"Заповніть стан пристрою та комплектацію"});
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const repair=await client.query("SELECT id,status FROM service_requests WHERE id=$1 FOR UPDATE",[id]);
    if(!repair.rowCount){await client.query("ROLLBACK");return res.status(404).json({message:"Заявку не знайдено"});}
    if(repair.rows[0].status==="cancelled"){await client.query("ROLLBACK");return res.status(409).json({message:"Заявку скасовано"});}
    const shipment=await client.query("SELECT tracking_number,status FROM repair_shipments WHERE service_request_id=$1 AND direction='incoming' FOR UPDATE",[id]);
    if(!shipment.rowCount||!shipment.rows[0].tracking_number||shipment.rows[0].status==="cancelled"){await client.query("ROLLBACK");return res.status(409).json({message:"Спочатку вкажіть дійсну вхідну ТТН"});}
    await client.query("INSERT INTO repair_intakes(service_request_id,external_condition,accessories,serial_number,notes,received_by) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(service_request_id) DO UPDATE SET external_condition=EXCLUDED.external_condition,accessories=EXCLUDED.accessories,serial_number=EXCLUDED.serial_number,notes=EXCLUDED.notes,updated_at=NOW()",[id,intake.external_condition,intake.accessories,intake.serial_number,intake.notes,req.session.user.id]);
    await client.query("UPDATE repair_shipments SET status='received',updated_at=NOW() WHERE service_request_id=$1 AND direction='incoming'",[id]);
    await client.query("COMMIT");
    res.json({message:"Пристрій прийнято; стан і комплектацію зафіксовано"});
  }catch(error){await client.query("ROLLBACK").catch(()=>{});fail(res,error,"Shipping intake");}
  finally{client.release();}
});
module.exports=router;
