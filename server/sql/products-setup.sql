-- PULT+: каталог товарів. Виконайте один раз у pgAdmin (service_shop).
-- Безпечно запускати повторно: наявні товари не видаляються.
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(80) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    brand VARCHAR(100),
    model VARCHAR(150),
    description TEXT,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_active_brand ON products (is_active, brand);
CREATE INDEX IF NOT EXISTS idx_products_name ON products (name);
-- Приклад додавання товару (прибрати --, підставити реальні дані):
-- INSERT INTO products (sku, name, brand, model, price, stock, image_url)
-- VALUES ('SAMSUNG-TM1240', 'Пульт Samsung TM1240', 'Samsung', 'TM1240', 650.00, 5, '/png/samsung-tm1240.png');
