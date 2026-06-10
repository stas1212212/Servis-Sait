const express = require('express');
const router = express.Router();

// GET /api/services
router.get('/', (req, res) => {
  res.json([
    'Ремонт телефонов',
    'Ремонт ноутбуков',
    'Замена экрана',
    'Диагностика'
  ]);
});

module.exports = router;
