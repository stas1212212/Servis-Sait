"use strict";
const crypto=require("node:crypto");
const pool=require("./db");
// Shared PostgreSQL limiter: stores HMAC of identifiers, never raw IP or email.
const KEY=process.env.SESSION_SECRET||"PULT_PLUS_DEV_SECRET_CHANGE_LATER";
let checkedAttempts=0;
function hashKey(value){return crypto.createHmac("sha256",KEY).update(value).digest("hex");}
function sameOrigin(req,res,next){
  const origin=req.get("origin"),source=req.get("sec-fetch-site");
  if((origin&&origin!==req.protocol+"://"+req.get("host"))||(source&&source!=="same-origin"&&source!=="none"))
    return res.status(403).json({message:"Недозволене джерело запиту"});
  if(!req.is("application/json"))return res.status(415).json({message:"Очікується JSON"});
  next();
}
async function consume(key,max,minutes){
  const digest=hashKey(key);
  const query=await pool.query(
    `INSERT INTO pult_auth_attempts(attempt_key,count,expires_at)
     VALUES($1,1,NOW()+$2::int*INTERVAL '1 minute')
     ON CONFLICT(attempt_key) DO UPDATE SET
       count=CASE WHEN pult_auth_attempts.expires_at<NOW()
                  THEN 1 ELSE pult_auth_attempts.count+1 END,
       expires_at=CASE WHEN pult_auth_attempts.expires_at<NOW()
                       THEN NOW()+$2::int*INTERVAL '1 minute'
                       ELSE pult_auth_attempts.expires_at END
     RETURNING count`,[digest,minutes]);
  if(++checkedAttempts%100===0)pool.query("DELETE FROM pult_auth_attempts WHERE expires_at<NOW()").catch(error=>console.error("Auth limiter cleanup failed:",error.code||error.message));
  return Number(query.rows[0]?.count||0)<=max;
}
async function clear(key){
  await pool.query("DELETE FROM pult_auth_attempts WHERE attempt_key=$1",[hashKey(key)]);
}
async function regenerate(req,user){
  await new Promise((resolve,reject)=>req.session.regenerate(error=>error?reject(error):resolve()));
  req.session.user={id:user.id,name:user.name,email:user.email,auth_version:user.auth_version};
}
module.exports={sameOrigin,consume,clear,regenerate};
