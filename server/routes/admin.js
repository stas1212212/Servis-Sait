const express = require("express");
const pool = require("../db");
const requireAdmin = require("../middleware/requireAdmin");
const router = express.Router();

router.use(requireAdmin);

router.get("/repairs", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, tracking_code, name, phone, email, device_type, brand, model, issue,
              issue_cause, repair_type, status, user_id, created_at
       FROM service_requests ORDER BY created_at DESC, id DESC LIMIT 300`
    );
    res.json({ requests: result.rows });
  } catch (error) {
    console.error("Admin repairs list error:", error);
    res.status(500).json({ message: "Не вдалося завантажити заявки" });
  }
});

router.patch("/repairs/:id/status", async (req, res) => {
  const origin = req.get("origin");
  if (origin && origin !== `${req.protocol}://${req.get("host")}`) {
    return res.status(403).json({ message: "Недозволене джерело запиту" });
  }
  const id = Number(req.params.id);
  const statuses = ["pending", "in_progress", "waiting_parts", "completed", "cancelled"];
  const status = req.body?.status;
  if (!Number.isSafeInteger(id) || id < 1 || !statuses.includes(status)) {
    return res.status(400).json({ message: "Некоректний номер або статус заявки" });
  }
  try {
    const result = await pool.query(
      "UPDATE service_requests SET status = $1 WHERE id = $2 RETURNING id, status",
      [status, id]
    );
    if (!result.rowCount) return res.status(404).json({ message: "Заявку не знайдено" });
    res.json({ request: result.rows[0] });
  } catch (error) {
    console.error("Admin repair status update error:", error);
    res.status(500).json({ message: "Не вдалося оновити статус" });
  }
});


router.get("/orders", async (req, res) => {
  try {
    const ordersResult = await pool.query(
      `SELECT o.id,o.user_id,o.status,o.total,o.created_at,
              COALESCE(NULLIF(o.customer_name,''),u.name) AS customer_name,
              COALESCE(NULLIF(o.customer_email,''),u.email) AS customer_email,
              o.customer_phone,o.delivery_method,o.delivery_city,o.delivery_branch,
              o.customer_comment,o.payment_method,o.stock_restored
       FROM orders o LEFT JOIN users u ON u.id = o.user_id
       ORDER BY o.created_at DESC, o.id DESC LIMIT 300`
    );
    const orders = ordersResult.rows;
    if (!orders.length) return res.json({ orders: [] });
    const itemsResult = await pool.query(
      `SELECT order_id, product_name, quantity, price
       FROM order_items WHERE order_id = ANY($1::int[])
       ORDER BY id`,
      [orders.map(o => o.id)]
    );
    const byOrder = new Map();
    for (const item of itemsResult.rows) {
      if (!byOrder.has(item.order_id)) byOrder.set(item.order_id, []);
      byOrder.get(item.order_id).push({
        name: item.product_name, quantity: item.quantity, price: item.price
      });
    }
    res.json({ orders: orders.map(o => ({ ...o, items: byOrder.get(o.id) || [] })) });
  } catch (error) {
    console.error("Admin orders list error:", error);
    res.status(500).json({ message: "Не вдалося завантажити замовлення" });
  }
});

router.patch("/orders/:id/status", async (req, res) => {
  const origin=req.get("origin"),site=req.get("sec-fetch-site");
  if((origin&&origin!==req.protocol+"://"+req.get("host"))||site==="cross-site")
    return res.status(403).json({message:"Недозволене джерело запиту"});
  if(!req.is("application/json"))return res.status(415).json({message:"Очікується JSON"});
  const id=Number(req.params.id),status=req.body?.status;
  if(!Number.isSafeInteger(id)||id<1||!["pending","processing","shipped","completed","cancelled"].includes(status))
    return res.status(400).json({message:"Некоректний номер або статус замовлення"});
  let client;
  try {
    client=await pool.connect();
    await client.query("BEGIN");
    const found=await client.query("SELECT id,status,stock_restored FROM orders WHERE id=$1 FOR UPDATE",[id]);
    if(!found.rowCount){
      await client.query("ROLLBACK");return res.status(404).json({message:"Замовлення не знайдено"});
    }
    const order=found.rows[0],before=order.status;
    if(before===status){
      await client.query("COMMIT");
      return res.json({order:{id,status,stock_restored:!!order.stock_restored}});
    }
    if(before==="cancelled"){
      await client.query("ROLLBACK");
      return res.status(409).json({message:"Скасоване замовлення не можна відновити просто зміною статусу: склад уже міг бути повернений"});
    }
    if(status==="cancelled"){
      if(!["pending","processing"].includes(before)){
        await client.query("ROLLBACK");
        return res.status(409).json({message:"Замовлення вже відправлено або завершено. Потрібна окрема процедура повернення товару, а не звичайне скасування"});
      }
      if(order.stock_restored){
        await client.query("ROLLBACK");
        return res.status(409).json({message:"Залишок цього замовлення вже повернений на склад. Перевірте облік"});
      }
      const lines=await client.query("SELECT product_id,quantity FROM order_items WHERE order_id=$1 ORDER BY id FOR UPDATE",[id]);
      if(!lines.rowCount||lines.rows.some(x=>!Number.isSafeInteger(Number(x.product_id))||Number(x.product_id)<1||
        !Number.isSafeInteger(Number(x.quantity))||Number(x.quantity)<1)){
        await client.query("ROLLBACK");
        return res.status(409).json({message:"У старому замовленні бракує точних ID товарів. Скасуйте його лише після ручної звірки складу"});
      }
      for(const line of lines.rows){
        const updated=await client.query("UPDATE products SET stock=stock+$1,updated_at=NOW() WHERE id=$2 RETURNING id",
          [Number(line.quantity),Number(line.product_id)]);
        if(!updated.rowCount)throw Error("Product no longer exists: "+line.product_id);
      }
      await client.query("UPDATE orders SET status='cancelled',stock_restored=TRUE WHERE id=$1",[id]);
    }else{
      await client.query("UPDATE orders SET status=$1 WHERE id=$2",[status,id]);
    }
    await client.query(
      "INSERT INTO order_status_history(order_id,old_status,new_status,changed_by) VALUES($1,$2,$3,$4)",
      [id,before,status,req.session.user.id]);
    await client.query("COMMIT");
    res.json({order:{id,status,stock_restored:status==="cancelled"},message:status==="cancelled"?"Замовлення скасовано, резерв товарів повернено на склад":"Статус збережено"});
  }catch(error){
    if(client)await client.query("ROLLBACK").catch(()=>{});
    console.error("Admin order status error:",error);
    if(error.code==="42703"||error.code==="42P01")
      return res.status(503).json({message:"Для керування залишками виконайте server/sql/final-v1-setup.sql у pgAdmin"});
    res.status(500).json({message:"Не вдалося оновити статус замовлення"});
  }finally{if(client)client.release();}
});

// Product types and brands are managed in PostgreSQL, not a hardcoded list.
const TAXONOMY_MIGRATION="Зробіть резервну копію БД і виконайте server/sql/store-catalog-setup.sql у pgAdmin.";
function sameOrigin(req,res,next) {
  const origin=req.get("origin");
  if(origin && origin!==req.protocol+"://"+req.get("host"))
    return res.status(403).json({message:"Недозволене джерело запиту"});
  if(!req.is("application/json"))return res.status(415).json({message:"Очікується JSON"});
  next();
}
function validateProduct(body) {
  if(!body||typeof body!=="object"||Array.isArray(body))return null;
  const str=(key,max)=>{
    const value=body[key];
    if(value===undefined||value===null)return "";
    if(typeof value!=="string"||value.length>max)return null;
    return value.trim();
  };
  const sku=str("sku",80),name=str("name",200),brand=str("brand",100);
  const model=str("model",150),description=str("description",5000),image_url=str("image_url",1000);
  const category=str("category",40);
  const price=Number(body.price),stock=Number(body.stock);
  if([sku,name,brand,model,description,image_url,category].some(v=>v===null)||
      !sku||!name||!/^[a-z0-9][a-z0-9_-]{1,39}$/.test(category||"")||
      !Number.isFinite(price)||price<0||price>10000000||
      !Number.isInteger(stock)||stock<0||stock>1000000||
      typeof body.is_active!=="boolean")return null;
  // Allow old imported relative images, new absolute local paths; never external URLs.
  if(image_url&&!/^\/?(?:img|png)\/[a-zA-Z0-9/_-]+\.(webp|png|jpe?g|avif)$/i.test(image_url))
    return null;
  return {sku,name,brand,model,description,image_url,category,price,stock,is_active:body.is_active};
}
async function checkProductTaxonomy(p) {
  const cat=await pool.query("SELECT slug FROM product_categories WHERE slug=$1 AND is_active=TRUE",[p.category]);
  if(!cat.rowCount)return "Оберіть активну категорію. Нові типи товарів можна додати у блоці «Категорії»";
  if(p.brand) {
    const brand=await pool.query("SELECT name FROM product_brands WHERE lower(name)=lower($1) AND is_active=TRUE",[p.brand]);
    if(!brand.rowCount)return "Оберіть активний бренд або додайте його в блоці «Бренди»";
    p.brand=brand.rows[0].name;
  }
  return null;
}
function productFailure(res,error,context){
  if(error?.code==="23505")return res.status(409).json({message:"Такий SKU вже існує"});
  if(error?.code==="42P01"||error?.code==="42703")return res.status(503).json({message:TAXONOMY_MIGRATION});
  console.error(context,error);
  return res.status(500).json({message:"Помилка збереження товару"});
}
// Admin search intentionally includes both visible and archived products.
// Search is performed in PostgreSQL, so older matches outside the default
// 500 most recent entries remain findable.
router.get("/products",async(req,res)=>{
  const raw=req.query.search;
  if(raw!==undefined&&(typeof raw!=="string"||raw.length>120))
    return res.status(400).json({message:"Пошуковий запит занадто довгий"});
  const query=String(raw||"").trim().toLocaleLowerCase("uk");
  const fields="id,sku,name,brand,model,description,price,stock,image_url,category,is_active";
  const needle="strpos(lower(coalesce(name,'')),$1)>0 OR strpos(lower(coalesce(sku,'')),$1)>0 OR "+
    "strpos(lower(coalesce(brand,'')),$1)>0 OR strpos(lower(coalesce(model,'')),$1)>0 OR "+
    "strpos(lower(coalesce(category,'')),$1)>0";
  try{
    const result=query?
      await pool.query("SELECT "+fields+" FROM products WHERE "+needle+" ORDER BY id DESC LIMIT 500",[query]):
      await pool.query("SELECT "+fields+" FROM products ORDER BY id DESC LIMIT 500");
    res.json({products:result.rows,limit:500,search:query});
  }catch(e){console.error("Admin products error",e);res.status(500).json({message:"Помилка завантаження товарів"})}
});
router.post("/products",sameOrigin,async(req,res)=>{
  const p=validateProduct(req.body);
  if(!p)return res.status(400).json({message:"Перевірте назву, SKU, категорію, ціну, залишок та шлях до фото"});
  try{
    const error=await checkProductTaxonomy(p);
    if(error)return res.status(400).json({message:error});
    const result=await pool.query("INSERT INTO products(sku,name,brand,model,description,price,stock,image_url,category,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id",
      [p.sku,p.name,p.brand||null,p.model,p.description,p.price,p.stock,p.image_url||null,p.category,p.is_active]);
    res.status(201).json({id:result.rows[0].id});
  }catch(error){productFailure(res,error,"Create product");}
});
router.put("/products/:id",sameOrigin,async(req,res)=>{
  const id=Number(req.params.id),p=validateProduct(req.body);
  if(!Number.isSafeInteger(id)||id<1||!p)return res.status(400).json({message:"Некоректні дані товару"});
  try{
    const error=await checkProductTaxonomy(p);
    if(error)return res.status(400).json({message:error});
    const result=await pool.query("UPDATE products SET sku=$1,name=$2,brand=$3,model=$4,description=$5,price=$6,stock=$7,image_url=$8,category=$9,is_active=$10,updated_at=NOW() WHERE id=$11 RETURNING id",
      [p.sku,p.name,p.brand||null,p.model,p.description,p.price,p.stock,p.image_url||null,p.category,p.is_active,id]);
    if(!result.rowCount)return res.status(404).json({message:"Товар не знайдено"});
    res.json({id});
  }catch(error){productFailure(res,error,"Update product");}
});

function validProductId(raw){
  const id=Number(raw);
  return Number.isSafeInteger(id)&&id>0?id:null;
}

// Archive/restore changes only product visibility; pricing, stock, order
// history, original product SKU and photos are retained.
router.patch("/products/:id/visibility",sameOrigin,async(req,res)=>{
  const id=validProductId(req.params.id),active=req.body?.is_active;
  if(!id||typeof active!=="boolean")
    return res.status(400).json({message:"Некоректні дані видимості товару"});
  try{
    const result=await pool.query(
      "UPDATE products SET is_active=$1,updated_at=NOW() WHERE id=$2 RETURNING id,is_active",
      [active,id]);
    if(!result.rowCount)return res.status(404).json({message:"Товар не знайдено"});
    res.json({product:result.rows[0],message:active?"Товар відновлено з архіву":"Товар перенесено в архів"});
  }catch(error){productFailure(res,error,"Archive/restore product");}
});

// Permanent removal is deliberately separate from archiving: only an archived
// product with no historic purchases can be deleted. A matching SKU is required
// as explicit irreversible-action confirmation. Transaction + row lock prevent
// conflicts with another administrator, and FK constraints remain authoritative.
router.delete("/products/:id",sameOrigin,async(req,res)=>{
  const id=validProductId(req.params.id);
  const confirmSku=req.body?.confirm_sku;
  if(!id||typeof confirmSku!=="string"||!confirmSku||confirmSku.length>80)
    return res.status(400).json({message:"Введіть точний SKU товару для підтвердження видалення"});
  let client;
  try{
    client=await pool.connect();
    await client.query("BEGIN");
    const existing=await client.query(
      "SELECT id,sku,name,is_active FROM products WHERE id=$1 FOR UPDATE",[id]);
    if(!existing.rowCount){
      await client.query("ROLLBACK");
      return res.status(404).json({message:"Товар не знайдено"});
    }
    const product=existing.rows[0];
    if(product.is_active){
      await client.query("ROLLBACK");
      return res.status(409).json({message:"Спочатку перемістіть товар до архіву"});
    }
    if(confirmSku!==product.sku){
      await client.query("ROLLBACK");
      return res.status(400).json({message:"SKU не збігається. Товар не видалено"});
    }
    const linked=await client.query(
      "SELECT 1 FROM order_items WHERE product_id=$1 OR (product_id IS NULL AND product_name=$2) LIMIT 1",
      [id,product.name]);
    if(linked.rowCount){
      await client.query("ROLLBACK");
      return res.status(409).json({message:"Товар зустрічається в історії замовлень. Його можна залишити в архіві, але не видалити назавжди"});
    }
    const deleted=await client.query("DELETE FROM products WHERE id=$1 RETURNING id,sku",[id]);
    await client.query("COMMIT");
    res.json({deleted:deleted.rows[0],message:"Товар остаточно видалено"});
  }catch(error){
    if(client)await client.query("ROLLBACK").catch(()=>{});
    if(error.code==="23503")
      return res.status(409).json({message:"Товар використовується іншими записами. Залиште його в архіві"});
    if(error.code==="42703"||error.code==="42P01")
      return res.status(503).json({message:"Для безпечного видалення потрібна міграція server/sql/final-v1-setup.sql"});
    console.error("Permanent product deletion error",error);
    res.status(500).json({message:"Не вдалося видалити товар"});
  }finally{if(client)client.release();}
});

module.exports = router;
