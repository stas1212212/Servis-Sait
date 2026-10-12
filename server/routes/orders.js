/**
 * orders.js
 * Express-роутер для замовлень.
 *
 * ПОКЛАДАННЯ (підправ під себе, якщо не збігається):
 *  - Підключення до PostgreSQL лежить у ../db і експортує pg Pool
 *    (те саме, що вже використовує твій auth.js для users).
 *  - Поточний юзер визначається через req.session.userId
 *    (express-session). Якщо в auth.js це виглядає інакше
 *    (наприклад req.user.id через passport, або дані з JWT) —
 *    заміни requireAuthMiddleware нижче на свій реальний middleware.
 */

const express = require('express');
const router = express.Router();
const pool = require('../db'); // <-- підправ шлях, якщо у тебе інша назва файлу/структура

// -------------------------------------------------
// Middleware: пускаємо тільки залогінених юзерів
// -------------------------------------------------
function requireAuthMiddleware(req, res, next) {
    if (!req.session || !req.session.user || !req.session.user.id) {
        return res.status(401).json({
            message: 'Не авторизовано'
        });
    }

    next();
}
// -------------------------------------------------
// GET /api/orders
// Список замовлень поточного юзера (найновіші перші),
// разом з товарами в кожному замовленні.
// -------------------------------------------------
router.get('/', requireAuthMiddleware, async (req, res) => {
    const userId = req.session.user.id;

    try {
        const ordersResult = await pool.query(
            `SELECT id, status, total, created_at
             FROM orders
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [userId]
        );

        const orders = ordersResult.rows;

        if (orders.length === 0) {
            return res.json([]);
        }

        const orderIds = orders.map(o => o.id);

        const itemsResult = await pool.query(
            `SELECT order_id, product_name, quantity, price
             FROM order_items
             WHERE order_id = ANY($1::int[])`,
            [orderIds]
        );

        // групуємо товари по order_id
        const itemsByOrder = {};
        for (const item of itemsResult.rows) {
            if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
            itemsByOrder[item.order_id].push({
                name: item.product_name,
                qty: item.quantity,
                price: item.price
            });
        }

        const result = orders.map(order => ({
            id: order.id,
            status: order.status,
            total: order.total,
            createdAt: order.created_at,
            items: itemsByOrder[order.id] || []
        }));

        res.json(result);

    } catch (error) {
        console.error('GET /api/orders error:', error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
});

// -------------------------------------------------
// GET /api/orders/:id
// Одне конкретне замовлення (тільки якщо належить поточному юзеру)
// -------------------------------------------------
router.get('/:id', requireAuthMiddleware, async (req, res) => {
    const userId = req.session.user.id;
    const orderId = parseInt(req.params.id, 10);

    if (isNaN(orderId)) {
        return res.status(400).json({ message: 'Некоректний id замовлення' });
    }

    try {
        const orderResult = await pool.query(
            `SELECT id, status, total, created_at
             FROM orders
             WHERE id = $1 AND user_id = $2`,
            [orderId, userId]
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({ message: 'Замовлення не знайдено' });
        }

        const itemsResult = await pool.query(
            `SELECT product_name, quantity, price
             FROM order_items
             WHERE order_id = $1`,
            [orderId]
        );

        const order = orderResult.rows[0];

        res.json({
            id: order.id,
            status: order.status,
            total: order.total,
            createdAt: order.created_at,
            items: itemsResult.rows.map(i => ({
                name: i.product_name,
                qty: i.quantity,
                price: i.price
            }))
        });

    } catch (error) {
        console.error('GET /api/orders/:id error:', error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
});

// -------------------------------------------------
// POST /api/orders
// Створення нового замовлення (наприклад, після оформлення кошика).
// Очікує тіло:
// {
//   "items": [
//     { "productName": "Пульт Samsung TM1240", "quantity": 1, "price": 650 },
//     ...
//   ]
// }
// -------------------------------------------------
router.post('/', requireAuthMiddleware, async (req, res) => {
    const userId = req.session.user.id;
    const origin = req.get('origin');
    if (origin && origin !== `${req.protocol}://${req.get('host')}`) {
        return res.status(403).json({ message: 'Недозволене джерело запиту' });
    }

    const items = req.body?.items;
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
        return res.status(400).json({ message: 'Некоректний кошик' });
    }

    const quantities = new Map();
    for (const item of items) {
        const sku = item?.sku;
        const quantity = item?.quantity;
        if (typeof sku !== 'string' || !sku || sku.length > 80 ||
            !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) {
            return res.status(400).json({ message: 'Некоректний товар або кількість' });
        }
        const sum = (quantities.get(sku) || 0) + quantity;
        if (sum > 100) return res.status(400).json({ message: 'Завелика кількість товару' });
        quantities.set(sku, sum);
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const requested = [...quantities.entries()].sort(([a], [b]) => a.localeCompare(b));
        const confirmed = [];
        let totalCents = 0;

        for (const [sku, quantity] of requested) {
            const found = await client.query(
                'SELECT id, name, price, stock, is_active FROM products WHERE sku = $1 FOR UPDATE',
                [sku]
            );
            const product = found.rows[0];
            if (!product || !product.is_active) {
                const error = new Error('Товар більше не продається: ' + sku);
                error.status = 409;
                throw error;
            }
            if (product.stock < quantity) {
                const error = new Error('Недостатньо товару на складі: ' + product.name);
                error.status = 409;
                throw error;
            }
            const cents = Math.round(Number(product.price) * 100);
            if (!Number.isSafeInteger(cents) || cents < 0) throw new Error('Некоректна ціна в базі');
            totalCents += cents * quantity;
            if (!Number.isSafeInteger(totalCents)) throw new Error('Завелика сума замовлення');
            confirmed.push({ id: product.id, name: product.name, price: (cents / 100).toFixed(2), quantity });
        }

        const total = (totalCents / 100).toFixed(2);
        const inserted = await client.query(
            "INSERT INTO orders (user_id, status, total) VALUES ($1, 'pending', $2) RETURNING id, status, total, created_at",
            [userId, total]
        );
        const order = inserted.rows[0];
        for (const item of confirmed) {
            await client.query(
                'INSERT INTO order_items (order_id, product_name, quantity, price) VALUES ($1, $2, $3, $4)',
                [order.id, item.name, item.quantity, item.price]
            );
            await client.query('UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2',
                [item.quantity, item.id]);
        }
        await client.query('COMMIT');
        res.status(201).json({
            id: order.id, status: order.status, total: order.total,
            createdAt: order.created_at,
            items: confirmed.map(item => ({ productName: item.name, quantity: item.quantity, price: item.price }))
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('POST /api/orders error:', error);
        res.status(error.status || 500).json({ message: error.status ? error.message : 'Помилка оформлення замовлення' });
    } finally {
        client.release();
    }
});

module.exports = router;