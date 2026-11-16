"use strict";
const {consume}=require("../auth-security");

const TEST_SITEKEYS=new Set([
  "1x00000000000000000000AA","2x00000000000000000000AB",
  "1x00000000000000000000BB","2x00000000000000000000BB",
  "3x00000000000000000000FF"
]);
const TEST_SECRETS=new Set([
  "1x0000000000000000000000000000000AA",
  "2x0000000000000000000000000000000AA",
  "3x0000000000000000000000000000000AA"
]);
const SITEVERIFY="https://challenges.cloudflare.com/turnstile/v0/siteverify";

function getConfig(){
  const sitekey=String(process.env.TURNSTILE_SITEKEY||"").trim();
  const secret=String(process.env.TURNSTILE_SECRET_KEY||"").trim();
  const production=process.env.NODE_ENV==="production";
  const enabled=!!sitekey&&!!secret;
  if(!!sitekey!==!!secret)throw Error("TURNSTILE_SITEKEY and TURNSTILE_SECRET_KEY must be set together");
  if(production){
    if(!enabled)throw Error("Configure Turnstile sitekey and secret before production deployment");
    if(TEST_SITEKEYS.has(sitekey)||TEST_SECRETS.has(secret))
      throw Error("Cloudflare Turnstile test keys are forbidden in production");
    const base=new URL(String(process.env.PUBLIC_BASE_URL||""));
    if(base.protocol!=="https:"||!base.hostname)throw Error("PUBLIC_BASE_URL must use an HTTPS hostname in production");
  }
  return {sitekey,secret,enabled,production,testKeys:TEST_SITEKEYS.has(sitekey)&&TEST_SECRETS.has(secret)};
}
function publicConfig(){
  const {enabled,sitekey}=getConfig();
  return {enabled,sitekey:enabled?sitekey:null};
}
// Never accept X-Forwarded-For/CF-Connecting-IP directly. req.ip is determined
// by Express's configured trusted proxy. The origin must be firewall-restricted.
function writeLimiter(kind,max,minutes){
  return async function limitWrite(req,res,next){
    if(req.method!=="POST")return next();
    try{
      const allowed=await consume("traffic:"+kind+":"+String(req.ip||"unknown"),max,minutes);
      if(!allowed){
        res.set("Retry-After",String(minutes*60));
        return res.status(429).json({message:"Забагато запитів. Спробуйте пізніше."});
      }
      next();
    }catch(error){
      console.error("Traffic limiter unavailable:",error.code||error.message);
      return res.status(503).json({message:"Тимчасово недоступно. Спробуйте пізніше."});
    }
  };
}
async function verifyToken(token,{secret,action,ip,production,testKeys,hostname,fetchImpl=fetch}){
  if(typeof token!=="string"||!token||token.length>2048)return {ok:false,reason:"missing"};
  try{
    const fields=new URLSearchParams({secret,response:token});
    if(ip)fields.set("remoteip",ip);
    const response=await fetchImpl(SITEVERIFY,{
      method:"POST",
      headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body:fields,
      signal:AbortSignal.timeout(7000)
    });
    if(!response.ok)return {ok:false,reason:"service"};
    const data=await response.json();
    if(!data?.success)return {ok:false,reason:"invalid"};
    // Test keys return example.com and do not supply action/cdata. Never
    // permit the test exemption on production.
    if(production||!testKeys){
      if(data.action!==action||!data.hostname||data.hostname!==hostname)
        return {ok:false,reason:"mismatch"};
    }
    return {ok:true};
  }catch(error){
    console.error("Turnstile verification unavailable:",error.name||"error");
    return {ok:false,reason:"service"};
  }
}
function turnstileGuard(action){
  return async function protectWrite(req,res,next){
    if(req.method!=="POST")return next();
    let config;
    try{config=getConfig();}catch(error){
      console.error("Turnstile configuration error:",error.message);
      return res.status(503).json({message:"Захист форми тимчасово не налаштований"});
    }
    if(!config.enabled)return next(); // Local development only; production startup refuses this.
    const token=req.body?.turnstile_token;
    if(typeof token!=="string"||!token||token.length>2048)
      return res.status(400).json({message:"Підтвердьте, що ви не робот, та повторіть спробу."});
    const expectedHostname=new URL(process.env.PUBLIC_BASE_URL||"http://localhost:3000").hostname;
    const verified=await verifyToken(token,{
      secret:config.secret,action,ip:req.ip,production:config.production,
      testKeys:config.testKeys,hostname:expectedHostname
    });
    if(!verified.ok)return res.status(verified.reason==="service"?503:403).json({
      message:verified.reason==="service"
        ?"Перевірка безпеки тимчасово недоступна. Спробуйте пізніше."
        :"Перевірка проти ботів не пройдена. Оновіть перевірку і повторіть спробу."
    });
    next();
  };
}
module.exports={getConfig,publicConfig,writeLimiter,verifyToken,turnstileGuard};
