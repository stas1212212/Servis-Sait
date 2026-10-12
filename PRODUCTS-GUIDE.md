# PULT+ — каталог товарів

## Де що змінювати

- `server/sql/products-setup.sql` — структура таблиці PostgreSQL. Виконайте в pgAdmin для бази `service_shop`.
- `server/routes/products.js` — серверний API для читання товарів. Не змінюйте ціни тут.
- `server/public/css/` — вигляд сторінок і карток товарів.
- `server/public/js/cart.js` — браузерний кошик; ціни в ньому не є довіреними.

## Як додати пульт

У pgAdmin відкрийте Query Tool бази `service_shop` та виконайте:

```sql
INSERT INTO products (sku, name, brand, model, price, stock, image_url)
VALUES ('SAMSUNG-TM1240', 'Пульт Samsung TM1240', 'Samsung', 'TM1240', 650.00, 5, '/png/samsung-tm1240.png');
```

Замініть приклад на справжні дані, а файл зображення покладіть у `server/public/png/`.

## Як змінити ціну або залишок

```sql
UPDATE products SET price = 700.00, stock = 4, updated_at = NOW()
WHERE sku = 'SAMSUNG-TM1240';
```

## Як приховати товар

```sql
UPDATE products SET is_active = FALSE, updated_at = NOW()
WHERE sku = 'SAMSUNG-TM1240';
```

Перевірка: відкрийте `http://localhost:3000/api/products` — сервер поверне JSON з активними товарами.

**Важливо:** старий магазин і замовлення поки працюють за попередньою схемою. Каталог ще не підключений до сторінок магазину та оформлення замовлень. Наступний етап — перенести наявні товари й перевіряти ціни на сервері.
