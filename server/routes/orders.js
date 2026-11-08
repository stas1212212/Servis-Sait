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
// The visibility migration is optional until installed on the local DB.
// Old installations can still load historical orders before running SQL.
async function hasHistoryVisibility() {
    const result = await pool.query(
        "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='orders' AND column_name='customer_hidden_at') AS ready"
    );
    return result.rows[0]?.ready === true;
}


function validateCustomer(raw) {
  if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
  const value=(field,max)=>{
    const item=raw[field];
    return typeof item==="string"&&item.trim().length<=max?item.trim():null;
  };
  const name=value("name",120),phone=value("phone",30),email=value("email",254),
    deliveryMethod=value("delivery_method",30),city=value("delivery_city",120),
    branch=value("delivery_branch",180),comment=value("comment",1000);
  if([name,phone,email,deliveryMethod,city,branch,comment].some(x=>x===null)||
     name.length<2 || !/^\+?[0-9()\s-]{9,30}$/.test(phone) ||
     phone.replace(/\D/g,"").length<9 ||
     (email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
     !["nova_poshta","ukrposhta","discuss"].includes(deliveryMethod) ||
     (deliveryMethod!=="discuss"&&(!city||!branch)))return null;
  return {name,phone,email,deliveryMethod,city,branch,comment};
}

// -------------------------------------------------
// GET /api/orders
// Список замовлень поточного юзера (найновіші перші),
// разом з товарами в кожному замовленні.
// -------------------------------------------------
router.get('/', requireAuthMiddleware, async (req, res) => {
    const userId = req.session.user.id;

    try {
        const visibilityReady = await hasHistoryVisibility();
        const ordersResult = await pool.query(
            `SELECT id, status, total, created_at, delivery_method, delivery_city, delivery_branch, payment_method
             FROM orders
             WHERE user_id = $1${visibilityReady ? ' AND customer_hidden_at IS NULL' : ''}
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
            delivery_method:order.delivery_method,
            delivery_city:order.delivery_city,
            delivery_branch:order.delivery_branch,
            payment_method:order.payment_method,
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
        const visibilityReady = await hasHistoryVisibility();
        const orderResult = await pool.query(
            `SELECT id, status, total, created_at, delivery_method, delivery_city, delivery_branch, payment_method
             FROM orders
             WHERE id = $1 AND user_id = $2${visibilityReady ? ' AND customer_hidden_at IS NULL' : ''}`,
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

// DELETE /api/orders/:id
// Removes ONLY the customer's view of an order, keeping the sale/audit record
// and its item lines available to staff. Does NOT cancel or replenish stock.
router.delete('/:id', requireAuthMiddleware, async (req, res) => {
    const orderId = Number(req.params.id);
    if (!Number.isSafeInteger(orderId) || orderId < 1) {
        return res.status(400).json({message:'Некоректний номер замовлення'});
    }
    const origin = req.get('origin');
    const site = req.get('sec-fetch-site');
    if ((origin && origin !== req.protocol + '://' + req.get('host')) ||
        (site && site !== 'same-origin' && site !== 'none')) {
        return res.status(403).json({message:'Недозволене джерело запиту'});
    }
    try {
        if (!await hasHistoryVisibility()) {
            return res.status(503).json({message:'Спочатку виконайте server/sql/order-history-visibility.sql у pgAdmin'});
        }
        const saved = await pool.query(
            'UPDATE orders SET customer_hidden_at=NOW() WHERE id=$1 AND user_id=$2 AND customer_hidden_at IS NULL RETURNING id',
            [orderId, req.session.user.id]
        );
        if (!saved.rowCount) return res.status(404).json({message:'Замовлення не знайдено у вашому кабінеті'});
        return res.json({message:'Замовлення прибрано з історії кабінету. Воно не скасоване, а запис збережено для сервісу.',order_id:saved.rows[0].id});
    } catch (error) {
        console.error('DELETE /api/orders/:id:',error);
        if (error.code === '42703') return res.status(503).json({message:'Виконайте server/sql/order-history-visibility.sql у pgAdmin'});
        return res.status(500).json({message:'Не вдалося прибрати замовлення'});
    }
});

// -------------------------------------------------
// POST /api/orders — validated contacts + server-side prices + reserved stock.
// Repeated requests with the same client_request_key return the same order.
// Requires final-v1-setup.sql; never trusts client-provided product prices.
// -------------------------------------------------
router.post('/', requireAuthMiddleware, async (req, res) => {
    const userId = req.session.user.id;
    const origin = req.get('origin');
    if (origin && origin !== `${req.protocol}://${req.get('host')}`) {
        return res.status(403).json({ message: 'Недозволене джерело запиту' });
    }

    const customer=validateCustomer(req.body?.customer);
    if(!customer)return res.status(400).json({message:"Заповніть контактні дані та відділення доставки"});
    const key=req.body?.client_request_key??null;
    if(key!==null&&(typeof key!=="string"||!/^[a-f0-9-]{36}$/i.test(key)))
      return res.status(400).json({message:"Некоректний ключ замовлення"});
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

    let client;
    try {
        client=await pool.connect();
        await client.query('BEGIN');
        if(key){
            const previous=await client.query(
              "SELECT id,status,total,created_at FROM orders WHERE user_id=$1 AND client_request_key=$2 FOR UPDATE",
              [userId,key]);
            if(previous.rowCount){
              await client.query('COMMIT');
              return res.status(200).json({id:previous.rows[0].id,status:previous.rows[0].status,total:previous.rows[0].total,createdAt:previous.rows[0].created_at,idempotent:true});
            }
        }
        // When taxonomy is configured, hidden categories/brands are not purchasable
        // even from an older basket or a manually crafted checkout request.
        const taxonomyCheck = await client.query("SELECT to_regclass('product_categories') IS NOT NULL AS categories, to_regclass('product_brands') IS NOT NULL AS brands");
        const taxonomyReady=taxonomyCheck.rows[0]?.categories===true&&taxonomyCheck.rows[0]?.brands===true;
        const requested = [...quantities.entries()].sort(([a], [b]) => a.localeCompare(b));
        const confirmed = [];
        let totalCents = 0;

        for (const [sku, quantity] of requested) {
            const found = await client.query(
                'SELECT id, name, price, stock, is_active, category, brand FROM products WHERE sku = $1 FOR UPDATE',
                [sku]
            );
            const product = found.rows[0];
            if (!product || !product.is_active) {
                const error = new Error('Товар більше не продається: ' + sku);
                error.status = 409;
                throw error;
            }
            if(taxonomyReady) {
                const blocked=await client.query(
                    "SELECT EXISTS(SELECT 1 FROM product_categories WHERE slug=$1 AND is_active=FALSE) AS category_hidden, EXISTS(SELECT 1 FROM product_brands WHERE lower(name)=lower($2) AND is_active=FALSE) AS brand_hidden",
                    [product.category,product.brand||""]
                );
                if(blocked.rows[0]?.category_hidden || blocked.rows[0]?.brand_hidden){
                    const error=new Error("Цей товар тимчасово недоступний для замовлення: "+product.name);
                    error.status=409;
                    throw error;
                }
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
            "INSERT INTO orders (user_id,status,total,customer_name,customer_phone,customer_email,delivery_method,delivery_city,delivery_branch,customer_comment,payment_method,client_request_key) VALUES ($1,'pending',$2,$3,$4,$5,$6,$7,$8,$9,'after_confirmation',$10) RETURNING id,status,total,created_at",
            [userId,total,customer.name,customer.phone,customer.email||null,customer.deliveryMethod,customer.city,customer.branch,customer.comment,key]
        );
        const order = inserted.rows[0];
        for (const item of confirmed) {
            await client.query(
                'INSERT INTO order_items (order_id, product_name, quantity, price, product_id) VALUES ($1, $2, $3, $4, $5)',
                [order.id, item.name, item.quantity, item.price, item.id]
            );
            await client.query('UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2',
                [item.quantity, item.id]);
        }
        await client.query('COMMIT');
        try {
            await pool.query('INSERT INTO admin_notifications(kind,ref_id,message) VALUES($1,$2,$3)',
                ['order', order.id, 'Нове замовлення №' + order.id]);
        } catch (notificationError) {
            console.error('Admin order notification failed:', notificationError);
        }
        res.status(201).json({
            id: order.id, status: order.status, total: order.total,
            createdAt: order.created_at,
            delivery_method:customer.deliveryMethod,items: confirmed.map(item => ({ productName: item.name, quantity: item.quantity, price: item.price }))
        });
    } catch (error) {
        if(client)await client.query('ROLLBACK').catch(()=>{});
        console.error('POST /api/orders error:', error);
        if(error.code==='23505'&&key){
          try{
            const old=await pool.query("SELECT id,status,total,created_at FROM orders WHERE user_id=$1 AND client_request_key=$2",[userId,key]);
            if(old.rowCount)return res.status(200).json({id:old.rows[0].id,status:old.rows[0].status,total:old.rows[0].total,createdAt:old.rows[0].created_at,idempotent:true});
          }catch(lookupError){console.error('Checkout retry error:',lookupError);}
        }
        if(error.code==='42703'||error.code==='42P01')return res.status(503).json({message:'Оформлення замовлень ще налаштовується. Будь ласка, зверніться до менеджера PULT+.'});
        res.status(error.status || 500).json({ message: error.status ? error.message : 'Помилка оформлення замовлення' });
    } finally {
        if(client)client.release();
    }
});

module.exports = router;