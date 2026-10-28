-- PULT+ multi-category shop catalog migration (PostgreSQL 13+).
-- Make a pgAdmin backup of the current service_shop database FIRST.
-- Safe to rerun: does NOT DROP/DELETE/UPDATE existing products, prices, stock, orders or users.
-- Run AFTER server/sql/products-setup.sql and import-existing-products.sql.
BEGIN;

CREATE TABLE IF NOT EXISTS product_categories (
  slug VARCHAR(40) PRIMARY KEY CHECK(slug ~ '^[a-z0-9][a-z0-9_-]{1,39}$'),
  name_uk VARCHAR(100) NOT NULL CHECK(length(trim(name_uk)) > 0),
  name_en VARCHAR(100) NOT NULL DEFAULT '',
  name_ru VARCHAR(100) NOT NULL DEFAULT '',
  icon VARCHAR(16) NOT NULL DEFAULT '📦',
  sort_order INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_categories_visible ON product_categories(is_active, sort_order);

CREATE TABLE IF NOT EXISTS product_brands (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL CHECK(length(trim(name)) > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_brands_casefold ON product_brands(lower(name));
CREATE INDEX IF NOT EXISTS idx_product_brands_active ON product_brands(is_active);

-- Preserve ALL previous remote-control categories, and add new merchandise types.
-- These are taxonomy entries, NOT fake products or stock.
INSERT INTO product_categories(slug,name_uk,name_en,name_ru,icon,sort_order) VALUES
 ('tv','Пульти для телевізорів','TV remotes','Пульты для телевизоров','📺',10),
 ('universal','Універсальні пульти','Universal remotes','Универсальные пульты','🎮',20),
 ('receiver','Пульти для ресиверів','Receiver remotes','Пульты для ресиверов','📡',30),
 ('tvbox','Пульти для TV Box','TV Box remotes','Пульты для TV Box','📱',40),
 ('ac','Пульти для кондиціонерів','Air conditioner remotes','Пульты для кондиционеров','❄️',50),
 ('audio','Пульти для аудіотехніки','Audio remotes','Пульты для аудиотехники','🔊',60),
 ('parts','Запчастини','Spare parts','Запчасти','🔧',70),
 ('batteries','Батарейки та акумулятори','Batteries','Батарейки и аккумуляторы','🔋',80),
 ('headphones','Навушники та гарнітури','Headphones & headsets','Наушники и гарнитуры','🎧',90),
 ('accessories','Аксесуари','Accessories','Аксессуары','🔌',100),
 ('cables','Кабелі та адаптери','Cables & adapters','Кабели и адаптеры','🔗',110),
 ('other','Інші товари','Other products','Другие товары','📦',120)
ON CONFLICT (slug) DO NOTHING;

-- If the old DB has other category keys, register them without changing products.
INSERT INTO product_categories(slug,name_uk,name_en,name_ru,icon,sort_order)
SELECT DISTINCT lower(trim(category)), trim(category), trim(category), trim(category), '📦', 500
FROM products
WHERE category IS NOT NULL
  AND trim(category) ~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{1,39}$'
ON CONFLICT (slug) DO NOTHING;

-- Import all existing product brands; never replace product rows or stock.
INSERT INTO product_brands(name)
SELECT DISTINCT trim(brand) FROM products
WHERE brand IS NOT NULL AND trim(brand) <> '' AND length(trim(brand)) <= 100
ON CONFLICT DO NOTHING;

COMMIT;

-- Check:
-- SELECT slug,name_uk,is_active FROM product_categories ORDER BY sort_order,name_uk;
-- SELECT id,name,is_active FROM product_brands ORDER BY name;
-- SELECT COUNT(*) FROM products;
