const express = require("express");
const pool = require("../db");

const router = express.Router();

// GET /api/products — лише активні товари, доступні покупцям.
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, sku, name, brand, model, description, price,
              stock, image_url, category, old_price, rating, features, compatible
       FROM products
       WHERE is_active = TRUE
       ORDER BY name ASC, id ASC
       LIMIT 500`
    );
    res.json({ products: result.rows });
  } catch (error) {
    console.error("GET /api/products error:", error);
    res.status(500).json({ message: "Не вдалося завантажити товари" });
  }
});

// GET /api/products/:id — деталі одного активного товару.
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ message: "Некоректний ID товару" });
  }
  try {
    const result = await pool.query(
      `SELECT id, sku, name, brand, model, description, price,
              stock, image_url, category, old_price, rating, features, compatible
       FROM products WHERE id = $1 AND is_active = TRUE`,
      [id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ message: "Товар не знайдено" });
    }
    res.json({ product: result.rows[0] });
  } catch (error) {
    console.error("GET /api/products/:id error:", error);
    res.status(500).json({ message: "Не вдалося завантажити товар" });
  }
});

module.exports = router;
