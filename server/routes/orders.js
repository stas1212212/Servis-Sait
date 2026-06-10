const express = require('express');
const router = express.Router();
const pool = require('../db');

// Получить все заявки (для админа)
router.get('/', async (req, res) => {
  const orders = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
  res.json(orders.rows);
});

// Создать новую заявку
router.post('/', async (req, res) => {
  const { client_name, phone, service, address } = req.body;
  const newOrder = await pool.query(
    'INSERT INTO orders (client_name, phone, service, address) VALUES ($1,$2,$3,$4) RETURNING *',
    [client_name, phone, service, address]
  );
  res.json(newOrder.rows[0]);
});

module.exports = router;
