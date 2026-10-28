"use strict";
const express=require("express");
const pool=require("../db");
const requireAdmin=require("../middleware/requireAdmin");
const router=express.Router();
const MIGRATION="Зробіть резервну копію БД і виконайте server/sql/store-catalog-setup.sql у pgAdmin.";

function field(body,key,max,required=false) {
  const value=body?.[key];
  if(typeof value!=="string"||value.length>max)return null;
  const cleaned=value.trim();
  if(required&&!cleaned)return null;
  return cleaned;
}
function categoryPayload(body,includeSlug) {
  if(!body||typeof body!=="object"||Array.isArray(body))return null;
  const slug=includeSlug?field(body,"slug",40,true):null;
  const name_uk=field(body,"name_uk",100,true);
  const name_en=field(body,"name_en",100);
  const name_ru=field(body,"name_ru",100);
  const icon=field(body,"icon",16,true);
  const sort_order=Number(body.sort_order);
  if((includeSlug&&!/^[a-z0-9][a-z0-9_-]{1,39}$/.test(slug||""))||
    [name_uk,name_en,name_ru,icon].some(x=>x===null)||
    !Number.isSafeInteger(sort_order)||sort_order<0||sort_order>99999||
    typeof body.is_active!=="boolean")return null;
  return {slug,name_uk,name_en,name_ru,icon,sort_order,is_active:body.is_active};
}
function brandPayload(body) {
  const name=field(body,"name",100,true);
  if(!name||typeof body?.is_active!=="boolean")return null;
  return {name,is_active:body.is_active};
}
function checkOrigin(req,res,next) {
  const origin=req.get("origin");
  if(origin&&origin!==req.protocol+"://"+req.get("host"))return res.status(403).json({message:"Недозволене джерело запиту"});
  if(!req.is("application/json"))return res.status(415).json({message:"Потрібен JSON"});
  next();
}
function fail(res,error,context) {
  console.error(context,error);
  if(error?.code==="23505")return res.status(409).json({message:"Така категорія або бренд уже існує"});
  if(error?.code==="23514"||error?.code==="22001")return res.status(400).json({message:"Некоректні дані або занадто довге значення"});
  if(error?.code==="42P01"||error?.code==="42703")return res.status(503).json({message:MIGRATION});
  return res.status(500).json({message:"Не вдалося зберегти каталог"});
}
async function schemaReady() {
  const result=await pool.query("SELECT to_regclass('product_categories') IS NOT NULL AS categories,to_regclass('product_brands') IS NOT NULL AS brands");
  return result.rows[0]?.categories===true&&result.rows[0]?.brands===true;
}
async function requireTaxonomy(req,res,next) {
  try{if(!await schemaReady())return res.status(503).json({message:MIGRATION});next();}
  catch(error){fail(res,error,"Taxonomy readiness");}
}
// Public metadata contains only active categories and brands, never admin controls.
router.get("/options",requireTaxonomy,async(req,res)=>{
  try{
    const [categories,brands]=await Promise.all([
      pool.query("SELECT c.slug,c.name_uk,c.name_en,c.name_ru,c.icon,(SELECT COUNT(*)::int FROM products p WHERE p.category=c.slug AND p.is_active=TRUE) AS product_count,(SELECT COUNT(*)::int FROM products p WHERE p.category=c.slug AND p.is_active=TRUE AND p.stock>0) AS available_count FROM product_categories c WHERE c.is_active=TRUE ORDER BY c.sort_order,c.name_uk"),
      pool.query("SELECT name FROM product_brands WHERE is_active=TRUE ORDER BY name")
    ]);
    res.json({categories:categories.rows,brands:brands.rows});
  }catch(error){fail(res,error,"Taxonomy options");}
});
router.use("/admin",requireAdmin,requireTaxonomy);
router.get("/admin",async(req,res)=>{
  try{
    const [categories,brands]=await Promise.all([
      pool.query("SELECT slug,name_uk,name_en,name_ru,icon,sort_order,is_active FROM product_categories ORDER BY sort_order,name_uk"),
      pool.query("SELECT id,name,is_active FROM product_brands ORDER BY lower(name)")
    ]);
    res.json({categories:categories.rows,brands:brands.rows});
  }catch(error){fail(res,error,"Taxonomy admin list");}
});
router.post("/admin/categories",checkOrigin,async(req,res)=>{
  const item=categoryPayload(req.body,true);
  if(!item)return res.status(400).json({message:"Вкажіть латинський код, назву, іконку, порядок та стан категорії"});
  try{
    const result=await pool.query("INSERT INTO product_categories(slug,name_uk,name_en,name_ru,icon,sort_order,is_active) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING slug",
      [item.slug,item.name_uk,item.name_en,item.name_ru,item.icon,item.sort_order,item.is_active]);
    res.status(201).json({slug:result.rows[0].slug});
  }catch(error){fail(res,error,"Create category");}
});
router.put("/admin/categories/:slug",checkOrigin,async(req,res)=>{
  const slug=req.params.slug,item=categoryPayload(req.body,false);
  if(!/^[a-z0-9][a-z0-9_-]{1,39}$/.test(slug)||!item)return res.status(400).json({message:"Невірні дані категорії"});
  try{
    const result=await pool.query("UPDATE product_categories SET name_uk=$1,name_en=$2,name_ru=$3,icon=$4,sort_order=$5,is_active=$6,updated_at=NOW() WHERE slug=$7 RETURNING slug",
      [item.name_uk,item.name_en,item.name_ru,item.icon,item.sort_order,item.is_active,slug]);
    if(!result.rowCount)return res.status(404).json({message:"Категорію не знайдено"});
    res.json({slug});
  }catch(error){fail(res,error,"Update category");}
});
router.post("/admin/brands",checkOrigin,async(req,res)=>{
  const item=brandPayload(req.body);
  if(!item)return res.status(400).json({message:"Вкажіть назву та стан бренду"});
  try{
    const result=await pool.query("INSERT INTO product_brands(name,is_active) VALUES($1,$2) RETURNING id",
      [item.name,item.is_active]);
    res.status(201).json({id:result.rows[0].id});
  }catch(error){fail(res,error,"Create brand");}
});
router.put("/admin/brands/:id",checkOrigin,async(req,res)=>{
  const id=Number(req.params.id),item=brandPayload(req.body);
  if(!Number.isSafeInteger(id)||id<1||!item)return res.status(400).json({message:"Невірні дані бренду"});
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const previous=await client.query("SELECT name FROM product_brands WHERE id=$1 FOR UPDATE",[id]);
    if(!previous.rowCount){await client.query("ROLLBACK");return res.status(404).json({message:"Бренд не знайдено"});}
    await client.query("UPDATE product_brands SET name=$1,is_active=$2,updated_at=NOW() WHERE id=$3",
      [item.name,item.is_active,id]);
    if(item.name!==previous.rows[0].name){
      await client.query("UPDATE products SET brand=$1,updated_at=NOW() WHERE lower(trim(brand))=lower($2)",
        [item.name,previous.rows[0].name]);
    }
    await client.query("COMMIT");
    res.json({id});
  }catch(error){await client.query("ROLLBACK").catch(()=>{});fail(res,error,"Update brand");}
  finally{client.release();}
});

module.exports=router;
module.exports.schemaReady=schemaReady;
module.exports.categoryPayload=categoryPayload;
module.exports.brandPayload=brandPayload;
