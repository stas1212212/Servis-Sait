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

module.exports = router;
