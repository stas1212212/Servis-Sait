"use strict";
const express = require("express");
const crypto = require("node:crypto");
const bcrypt = require("bcrypt");
const pool = require("../db");
const requireAdmin = require("../middleware/requireAdmin");
const router = express.Router();

const SETTING_LIMITS = Object.freeze({phone:35,telegram:100,email:254,address:200,business_hours:150});
const RESET_REPLY = "Якщо така адреса зареєстрована та пошта налаштована, ви отримаєте лист з інструкціями.";
const attempts = new Map();

function mutationGuard(req,res,next) {
  const origin = req.get("origin");
  const site = req.get("sec-fetch-site");
  if ((origin && origin !== req.protocol + "://" + req.get("host")) || site === "cross-site")
    return res.status(403).json({message:"Недозволене джерело запиту"});
  if (!req.is("application/json")) return res.status(415).json({message:"Потрібен JSON"});
  next();
}
function requireUser(req,res,next) {
  if (!req.session?.user?.id) return res.status(401).json({message:"Увійдіть у кабінет"});
  next();
}
function limited(key,max,intervalMs) {
  const now=Date.now();
  if (attempts.size>10000) for (const [k,v] of attempts) {if(v.until<now)attempts.delete(k);}
  const current=attempts.get(key);
  if (!current || current.until<=now) {attempts.set(key,{count:1,until:now+intervalMs});return false;}
  current.count++;
  return current.count>max;
}
function safeEmail(raw) {return typeof raw==="string" && raw.length<=254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);}
function hashToken(token) {return crypto.createHash("sha256").update(token).digest("hex");}
async function sendResetEmail(address, token) {
  const apiKey=process.env.RESEND_API_KEY;
  const from=process.env.MAIL_FROM;
  const base=process.env.PUBLIC_BASE_URL;
  if (!apiKey || !from || !base || !/^https:\/\/|^http:\/\/localhost(?::\d+)?$/.test(base)) {
    console.warn("Password reset mail delivery is not configured (RESEND_API_KEY / MAIL_FROM / PUBLIC_BASE_URL).");
    return false;
  }
  const link=base.replace(/\/$/,"")+"/reset-password.html#token="+encodeURIComponent(token);
  const response=await fetch("https://api.resend.com/emails", {
    method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},
    body:JSON.stringify({from,to:[address],subject:"PULT+ — відновлення пароля",
      text:"Використайте це одноразове посилання протягом 20 хвилин:\n"+link+"\nЯкщо ви не запитували відновлення, проігноруйте цей лист."})
  });
  if (!response.ok) {console.error("Reset email delivery failed: HTTP",response.status);return false;}
  return true;
}

router.post("/password/forgot",mutationGuard,async(req,res)=>{
  res.set("Cache-Control","no-store");
  const email=typeof req.body?.email==="string"?req.body.email.trim().toLowerCase():"";
  if (!safeEmail(email))return res.status(400).json({message:"Перевірте email"});
  if (limited("reset-ip:"+req.ip,8,20*60*1000)||limited("reset-email:"+hashToken(email),3,20*60*1000))
    return res.json({message:RESET_REPLY});
  try {
    const result=await pool.query("SELECT id,email FROM users WHERE LOWER(email)=$1",[email]);
    if (result.rowCount) {
      const user=result.rows[0], token=crypto.randomBytes(32).toString("hex");
      await pool.query(
        "INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES($1,$2,NOW()+INTERVAL '20 minutes') ON CONFLICT(user_id) DO UPDATE SET token_hash=EXCLUDED.token_hash,expires_at=EXCLUDED.expires_at,created_at=NOW()",
        [user.id,hashToken(token)]
      );
      let sent=false;
      try {sent=await sendResetEmail(user.email,token);}catch(e){console.error("Reset email transport error:",e.message);}
      if (!sent)await pool.query("DELETE FROM password_reset_tokens WHERE user_id=$1 AND token_hash=$2",[user.id,hashToken(token)]);
    }
    return res.json({message:RESET_REPLY});
  }catch(e){console.error("Forgot password error:",e);return res.status(503).json({message:"Спробуйте пізніше"});}
});
router.post("/password/reset",mutationGuard,async(req,res)=>{
  res.set("Cache-Control","no-store");
  const token=req.body?.token,password=req.body?.password;
  if(typeof token!=="string" || !/^[a-f0-9]{64}$/i.test(token) || typeof password!=="string" || password.length<10 || password.length>72)
    return res.status(400).json({message:"Невірне посилання або пароль (потрібно 10–72 символи)"});
  if(limited("reset-use:"+req.ip,15,20*60*1000))return res.status(429).json({message:"Спробуйте пізніше"});
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    const found=await client.query("SELECT user_id FROM password_reset_tokens WHERE token_hash=$1 AND expires_at>NOW() FOR UPDATE",[hashToken(token)]);
    if(!found.rowCount){await client.query("ROLLBACK");return res.status(400).json({message:"Посилання недійсне або термін дії минув"});}
    const hash=await bcrypt.hash(password,12);
    await client.query("UPDATE users SET password_hash=$1 WHERE id=$2",[hash,found.rows[0].user_id]);
    await client.query("DELETE FROM password_reset_tokens WHERE user_id=$1",[found.rows[0].user_id]);
    await client.query("COMMIT");
    if(req.session)req.session.destroy(()=>{});
    return res.json({message:"Пароль змінено. Тепер увійдіть із новим паролем."});
  }catch(e){await client.query("ROLLBACK");console.error("Reset password error:",e);return res.status(500).json({message:"Не вдалося змінити пароль"});}
  finally{client.release();}
});

router.get("/track/:code",async(req,res)=>{
  res.set("Cache-Control","no-store");
  const code=String(req.params.code||"").trim().toUpperCase();
  if(!/^RP-[A-F0-9]{24,32}$/.test(code))return res.status(400).json({message:"Перевірте номер заявки"});
  if(limited("track:"+req.ip,90,60*60*1000))return res.status(429).json({message:"Забагато запитів"});
  try {
    const result=await pool.query("SELECT tracking_code,status,created_at FROM service_requests WHERE tracking_code=$1",[code]);
    if(!result.rowCount)return res.status(404).json({message:"Заявку не знайдено"});
    return res.json({request:result.rows[0]});
  }catch(e){console.error("Tracking error:",e);return res.status(500).json({message:"Сервіс тимчасово недоступний"});}
});

router.get("/settings",async(req,res)=>{
  try {
    const result=await pool.query("SELECT key,value FROM site_settings WHERE key=ANY($1::text[])",[Object.keys(SETTING_LIMITS)]);
    res.set("Cache-Control","no-store");
    return res.json({settings:Object.fromEntries(result.rows.map(r=>[r.key,r.value]))});
  }catch(e){console.error("Public settings error:",e);res.status(500).json({message:"Налаштування недоступні"});}
});
router.get("/admin/settings",requireAdmin,async(req,res)=>{
  try {
    const result=await pool.query("SELECT key,value FROM site_settings");
    res.json({settings:Object.fromEntries(result.rows.map(r=>[r.key,r.value]))});
  }catch(e){console.error(e);res.status(500).json({message:"Помилка налаштувань"});}
});
router.put("/admin/settings",requireAdmin,mutationGuard,async(req,res)=>{
  const settings=req.body?.settings;
  if(!settings||typeof settings!=="object"||Array.isArray(settings)||Object.keys(settings).length===0)
    return res.status(400).json({message:"Введіть налаштування"});
  for(const [key,value] of Object.entries(settings)){
    if(!(key in SETTING_LIMITS)||typeof value!=="string"||value.length>SETTING_LIMITS[key])
      return res.status(400).json({message:"Некоректне поле: "+key});
    if(key==="email"&&value&&!safeEmail(value))return res.status(400).json({message:"Некоректний email"});
  }
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    for(const [key,value] of Object.entries(settings))
      await client.query("INSERT INTO site_settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()",[key,value.trim()]);
    await client.query("COMMIT");
    res.json({message:"Налаштування збережено"});
  }catch(e){await client.query("ROLLBACK");console.error(e);res.status(500).json({message:"Помилка збереження"});}
  finally{client.release();}
});

router.get("/admin/notifications",requireAdmin,async(req,res)=>{
  try{
    const [items,count]=await Promise.all([
      pool.query("SELECT id,kind,ref_id,message,is_read,created_at FROM admin_notifications ORDER BY created_at DESC,id DESC LIMIT 50"),
      pool.query("SELECT COUNT(*)::int AS unread FROM admin_notifications WHERE NOT is_read")
    ]);
    res.set("Cache-Control","no-store");
    res.json({notifications:items.rows,unread:count.rows[0].unread});
  }catch(e){console.error(e);res.status(500).json({message:"Помилка повідомлень"});}
});
router.patch("/admin/notifications/:id/read",requireAdmin,mutationGuard,async(req,res)=>{
  const id=Number(req.params.id);
  if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({message:"Невірний ID"});
  try{
    const x=await pool.query("UPDATE admin_notifications SET is_read=TRUE WHERE id=$1 RETURNING id",[id]);
    if(!x.rowCount)return res.status(404).json({message:"Не знайдено"});
    res.json({id});
  }catch(e){console.error(e);res.status(500).json({message:"Помилка"});}
});

router.get("/reviews",async(req,res)=>{
  try{
    const x=await pool.query("SELECT r.id,r.rating,r.comment,r.created_at,split_part(u.name,' ',1) AS author FROM repair_reviews r JOIN users u ON u.id=r.user_id WHERE r.status='approved' ORDER BY r.created_at DESC LIMIT 50");
    res.json({reviews:x.rows});
  }catch(e){console.error(e);res.status(500).json({message:"Відгуки недоступні"});}
});
router.get("/reviews/eligible",requireUser,async(req,res)=>{
  try{
    const x=await pool.query("SELECT s.id,s.device_type,s.brand,s.model,s.created_at FROM service_requests s LEFT JOIN repair_reviews r ON r.service_request_id=s.id WHERE s.user_id=$1 AND s.status='completed' AND r.id IS NULL ORDER BY s.created_at DESC LIMIT 100",[req.session.user.id]);
    res.json({requests:x.rows});
  }catch(e){console.error(e);res.status(500).json({message:"Помилка отримання ремонтів"});}
});
router.post("/reviews",requireUser,mutationGuard,async(req,res)=>{
  const id=Number(req.body?.request_id),rating=Number(req.body?.rating),comment=typeof req.body?.comment==="string"?req.body.comment.trim():"";
  if(!Number.isSafeInteger(id)||id<1||!Number.isInteger(rating)||rating<1||rating>5||comment.length<20||comment.length>1200)
    return res.status(400).json({message:"Оберіть ремонт, оцінку 1–5 і введіть відгук від 20 символів"});
  try{
    const x=await pool.query(
      "INSERT INTO repair_reviews(service_request_id,user_id,rating,comment) SELECT id,user_id,$3,$4 FROM service_requests WHERE id=$1 AND user_id=$2 AND status='completed' ON CONFLICT(service_request_id) DO NOTHING RETURNING id",
      [id,req.session.user.id,rating,comment]
    );
    if(!x.rowCount)return res.status(409).json({message:"Ремонт не завершено, він не ваш або відгук уже залишено"});
    res.status(201).json({message:"Дякуємо! Відгук надіслано на перевірку."});
  }catch(e){console.error(e);res.status(500).json({message:"Не вдалося зберегти відгук"});}
});
router.get("/admin/reviews",requireAdmin,async(req,res)=>{
  try{
    const x=await pool.query("SELECT r.id,r.rating,r.comment,r.status,r.created_at,r.service_request_id,u.name AS author FROM repair_reviews r JOIN users u ON u.id=r.user_id ORDER BY r.created_at DESC LIMIT 100");
    res.json({reviews:x.rows});
  }catch(e){console.error(e);res.status(500).json({message:"Помилка відгуків"});}
});
router.patch("/admin/reviews/:id",requireAdmin,mutationGuard,async(req,res)=>{
  const id=Number(req.params.id),status=req.body?.status;
  if(!Number.isSafeInteger(id)||id<1||!["approved","rejected"].includes(status))
    return res.status(400).json({message:"Неприпустимий статус"});
  try {
    const x=await pool.query("UPDATE repair_reviews SET status=$1,moderated_at=NOW() WHERE id=$2 RETURNING id,status",[status,id]);
    if(!x.rowCount)return res.status(404).json({message:"Не знайдено"});
    res.json({review:x.rows[0]});
  }catch(e){console.error(e);res.status(500).json({message:"Помилка модерації"});}
});
module.exports=router;
