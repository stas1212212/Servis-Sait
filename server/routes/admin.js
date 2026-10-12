const express = require("express");
const pool = require("../db");
const requireAdmin = require("../middleware/requireAdmin");
const router = express.Router();

router.use(requireAdmin);

router.get("/repairs", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, phone, email, device_type, brand, model, issue,
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
      `SELECT o.id, o.user_id, o.status, o.total, o.created_at,
              u.name AS customer_name, u.email AS customer_email
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
  const origin = req.get("origin");
  if (origin && origin !== `${req.protocol}://${req.get("host")}`) {
    return res.status(403).json({ message: "Недозволене джерело запиту" });
  }
  const id = Number(req.params.id);
  const status = req.body?.status;
  const statuses = ["pending", "processing", "shipped", "completed", "cancelled"];
  if (!Number.isSafeInteger(id) || id < 1 || !statuses.includes(status)) {
    return res.status(400).json({ message: "Некоректний номер або статус замовлення" });
  }
  try {
    const result = await pool.query(
      "UPDATE orders SET status = $1 WHERE id = $2 RETURNING id, status",
      [status, id]
    );
    if (!result.rowCount) return res.status(404).json({ message: "Замовлення не знайдено" });
    res.json({ order: result.rows[0] });
  } catch (error) {
    console.error("Admin order status error:", error);
    res.status(500).json({ message: "Не вдалося оновити статус замовлення" });
  }
});


const allowedCategories = new Set(["tv","universal","receiver","tvbox","ac","audio","parts"]);
function sameOrigin(req,res,next) {
  const origin=req.get("origin");
  if(origin && origin!==`${req.protocol}://${req.get("host")}`) return res.status(403).json({message:"Недозволене джерело запиту"});
  next();
}
function validateProduct(body) {
  const str=(key,max)=>typeof body[key]==="string"?body[key].trim().slice(0,max):"";
  const sku=str("sku",80),name=str("name",200),brand=str("brand",100);
  const model=str("model",150),description=str("description",5000),image_url=str("image_url",1000);
  const category=str("category",40);
  const price=Number(body.price),stock=Number(body.stock);
  if(!sku||!name||!Number.isFinite(price)||price<0||price>10000000||!Number.isInteger(stock)||stock<0||stock>1000000||!allowedCategories.has(category))return null;
  if(image_url && !/^\/(img|png)\/[a-zA-Z0-9/_-]+\.(webp|png|jpe?g|avif)$/i.test(image_url))return null;
  return {sku,name,brand,model,description,image_url,category,price,stock,is_active:body.is_active===true};
}
router.get("/products",async(req,res)=>{
  try{const result=await pool.query("SELECT id,sku,name,brand,model,description,price,stock,image_url,category,is_active FROM products ORDER BY id DESC LIMIT 500");res.json({products:result.rows})}
  catch(e){console.error("Admin products error",e);res.status(500).json({message:"Помилка завантаження товарів"})}
});
router.post("/products",sameOrigin,async(req,res)=>{
  const p=validateProduct(req.body||{});
  if(!p)return res.status(400).json({message:"Перевірте назву, SKU, категорію, ціну, кількість та шлях до зображення"});
  try{
    const result=await pool.query(`INSERT INTO products(sku,name,brand,model,description,price,stock,image_url,category,is_active)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,[p.sku,p.name,p.brand,p.model,p.description,p.price,p.stock,p.image_url||null,p.category,p.is_active]);
    res.status(201).json({id:result.rows[0].id});
  }catch(e){if(e.code==="23505")return res.status(409).json({message:"Такий SKU вже існує"});console.error(e);res.status(500).json({message:"Помилка створення товару"})}
});
router.put("/products/:id",sameOrigin,async(req,res)=>{
  const id=Number(req.params.id),p=validateProduct(req.body||{});
  if(!Number.isSafeInteger(id)||id<1||!p)return res.status(400).json({message:"Некоректні дані товару"});
  try{
    const result=await pool.query(`UPDATE products SET sku=$1,name=$2,brand=$3,model=$4,description=$5,price=$6,stock=$7,image_url=$8,category=$9,is_active=$10,updated_at=NOW()
    WHERE id=$11 RETURNING id`,[p.sku,p.name,p.brand,p.model,p.description,p.price,p.stock,p.image_url||null,p.category,p.is_active,id]);
    if(!result.rowCount)return res.status(404).json({message:"Товар не знайдено"});
    res.json({id});
  }catch(e){if(e.code==="23505")return res.status(409).json({message:"Такий SKU вже існує"});console.error(e);res.status(500).json({message:"Помилка збереження товару"})}
});

module.exports = router;
