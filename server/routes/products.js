"use strict";
const express=require("express");
const pool=require("../db");
const {schemaReady}=require("./store-taxonomy");
const router=express.Router();
const FIELDS="p.id,p.sku,p.name,p.brand,p.model,p.description,p.price,p.stock,p.image_url,p.category,p.old_price,p.rating,p.features,p.compatible";
const ACTIVE="p.is_active=TRUE";
const CATALOG_FILTER=" AND COALESCE(c.is_active,TRUE)=TRUE AND COALESCE(b.is_active,TRUE)=TRUE";
const JOIN=" LEFT JOIN product_categories c ON c.slug=p.category LEFT JOIN product_brands b ON lower(b.name)=lower(p.brand)";
function source(taxonomyReady) {
  return " FROM products p"+(taxonomyReady?JOIN:"");
}
function filter(taxonomyReady) {
  return ACTIVE+(taxonomyReady?CATALOG_FILTER:"");
}
async function handleMissing(error,res,context){
  console.error(context,error);
  res.status(500).json({message:"Не вдалося завантажити товари"});
}
// Existing products still load normally before the optional taxonomy migration is applied.
router.get("/",async(req,res)=>{
  try{
    const ready=await schemaReady();
    const result=await pool.query(
      "SELECT "+FIELDS+source(ready)+" WHERE "+filter(ready)+" ORDER BY p.name ASC,p.id ASC LIMIT 500");
    res.json({products:result.rows});
  }catch(error){handleMissing(error,res,"GET /api/products");}
});
// Query by stable SKU so new categories (batteries, parts, headphones) have a real detail page.
router.get("/sku/:sku",async(req,res)=>{
  const sku=req.params.sku;
  if(typeof sku!=="string"||sku.length>80||!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(sku))
    return res.status(400).json({message:"Некоректний артикул"});
  try{
    const ready=await schemaReady();
    const result=await pool.query(
      "SELECT "+FIELDS+source(ready)+" WHERE p.sku=$1 AND "+filter(ready)+" LIMIT 1",[sku]);
    if(!result.rowCount)return res.status(404).json({message:"Товар не знайдено"});
    res.json({product:result.rows[0]});
  }catch(error){handleMissing(error,res,"GET product by sku");}
});
router.get("/:id",async(req,res)=>{
  const id=Number(req.params.id);
  if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({message:"Некоректний ID товару"});
  try{
    const ready=await schemaReady();
    const result=await pool.query(
      "SELECT "+FIELDS+source(ready)+" WHERE p.id=$1 AND "+filter(ready)+" LIMIT 1",[id]);
    if(!result.rowCount)return res.status(404).json({message:"Товар не знайдено"});
    res.json({product:result.rows[0]});
  }catch(error){handleMissing(error,res,"GET /api/products/:id");}
});
module.exports=router;
