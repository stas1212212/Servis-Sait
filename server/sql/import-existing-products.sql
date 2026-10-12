-- PULT+: перенесення наявного каталогу з server/public/data/pults.json
-- Спочатку виконайте products-setup.sql. Повторний запуск оновлює товари за SKU.
-- Старі замовлення не змінюються. Тестовий SAMSUNG-TM1240 не видаляється.
ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(40);
ALTER TABLE products ADD COLUMN IF NOT EXISTS old_price NUMERIC(12,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS compatible JSONB NOT NULL DEFAULT '[]'::jsonb;
BEGIN;
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('bn59-01357a','BN59-01357A','Samsung','BN59-01357A','Оригінальний Smart TV Remote',399,15,'img/products/samsung.webp','tv',499,5,'["Bluetooth","Smart TV","Голосове керування","Оригінальний"]'::jsonb,'["Samsung Crystal UHD","Samsung QLED","Samsung Neo QLED"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('bn59-01312f','BN59-01312F','Samsung','BN59-01312F','Smart TV Remote',379,18,'img/products/samsung2.webp','tv',449,5,'["Smart Hub","Bluetooth","Original Quality"]'::jsonb,'["Samsung UE Series","Samsung TU Series"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('lg-magic-2023','Magic Remote MR23','LG','Magic Remote MR23','Magic Remote з голосовим керуванням',549,11,'img/products/lg.webp','tv',649,5,'["Magic Pointer","Bluetooth","Voice Control"]'::jsonb,'["LG OLED","LG NanoCell","LG UHD"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('lg-akb75095308','AKB75095308','LG','AKB75095308','Оригінальний пульт LG',349,24,'img/products/lg2.webp','tv',429,5,'["Original","Smart TV"]'::jsonb,'["LG Smart TV"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('sony-rmf-tx310e','RMF-TX310E','Sony','RMF-TX310E','Пульт Sony Bravia',499,10,'img/products/sony.webp','tv',599,5,'["Bluetooth","Netflix","Google Assistant"]'::jsonb,'["Sony Bravia"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('sony-rmf-tx500','RMF-TX500','Sony','RMF-TX500','Smart Remote',579,8,'img/products/sony2.webp','tv',679,5,'["Voice","Bluetooth"]'::jsonb,'["Sony Android TV"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('philips-ykf474','YKF474','Philips','YKF474','Original Philips Remote',359,13,'img/products/philips.webp','tv',449,5,'["Original","Smart TV"]'::jsonb,'["Philips Android TV"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('tcl-rc802','RC802','TCL','RC802','Google TV Remote',379,19,'img/products/tcl.webp','tv',469,5,'["Bluetooth","Voice"]'::jsonb,'["TCL Google TV"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('hisense-en2g27','EN2G27','Hisense','EN2G27','Original Remote',339,20,'img/products/hisense.webp','tv',419,5,'["Smart TV"]'::jsonb,'["Hisense VIDAA"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('panasonic-n2q','N2QAYB001181','Panasonic','N2QAYB001181','Original Panasonic Remote',329,16,'img/products/panasonic.webp','tv',399,5,'["Original"]'::jsonb,'["Panasonic Viera"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('sharp-gj220','GJ220','Sharp','GJ220','Original Sharp Smart TV Remote',329,17,'img/products/sharp.webp','tv',399,5,'["Smart TV","Original"]'::jsonb,'["Sharp Aquos"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('toshiba-ct90405','CT-90405','Toshiba','CT-90405','Original Toshiba Remote',319,9,'img/products/toshiba.webp','tv',389,5,'["Original"]'::jsonb,'["Toshiba Smart TV"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('xiaomi-mi-box','Mi Box Remote','Xiaomi','Mi Box Remote','Bluetooth пульт для Mi Box',299,28,'img/products/xiaomi.webp','tvbox',359,5,'["Bluetooth","Voice Control"]'::jsonb,'["Mi Box S","Mi TV Stick"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('chromecast-google-tv','Chromecast Remote','Google','Chromecast Remote','Google TV Remote',349,12,'img/products/google.webp','tvbox',429,5,'["Bluetooth","Voice"]'::jsonb,'["Chromecast with Google TV"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('apple-tv-siri','Siri Remote','Apple','Siri Remote','Apple TV Siri Remote',999,5,'img/products/apple.webp','tvbox',1099,5,'["Bluetooth","Siri","Touch"]'::jsonb,'["Apple TV HD","Apple TV 4K"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('huayu-rm-l1130','RM-L1130+8','HUAYU','RM-L1130+8','Універсальний пульт',179,60,'img/products/universal.webp','universal',229,4,'["1000+ моделей"]'::jsonb,'["Samsung","LG","Sony","Philips"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('huayu-rm-d1078','RM-D1078','HUAYU','RM-D1078','Universal TV Remote',199,41,'img/products/universal2.webp','universal',249,5,'["Автоналаштування"]'::jsonb,'["Понад 1500 моделей"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('air-condition-daikin','ARC480A1','Daikin','ARC480A1','Пульт для кондиціонера',359,22,'img/products/daikin.webp','ac',429,5,'["Original"]'::jsonb,'["Daikin Split"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('gree-y512','Y512','Gree','Y512','Пульт кондиціонера Gree',339,20,'img/products/gree.webp','ac',399,5,'["Original"]'::jsonb,'["Gree"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('cooper-hunter','CH Remote','Cooper&Hunter','CH Remote','Оригінальний пульт',349,16,'img/products/ch.webp','ac',419,5,'["Original"]'::jsonb,'["Cooper&Hunter"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('mitsubishi-ac','RKX502A001','Mitsubishi','RKX502A001','Пульт для кондиціонера Mitsubishi',369,18,'img/products/mitsubishi.webp','ac',449,5,'["Original","LCD Display"]'::jsonb,'["Mitsubishi Electric"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('yamaha-rav','RAV283','Yamaha','RAV283','Пульт для AV ресивера',389,9,'img/products/yamaha.webp','audio',469,5,'["Original","Audio Receiver"]'::jsonb,'["Yamaha RX Series"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('denon-rc','RC-1216','Denon','RC-1216','Пульт для домашнього кінотеатру',419,8,'img/products/denon.webp','audio',499,5,'["Original"]'::jsonb,'["Denon AVR"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('sony-audio','RM-AMU197','Sony','RM-AMU197','Пульт музичного центру',299,11,'img/products/sony-audio.webp','audio',359,5,'["Original"]'::jsonb,'["Sony Hi-Fi"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('orton-4060','4060CX','Orton','4060CX','Пульт супутникового ресивера',189,33,'img/products/orton.webp','receiver',239,4,'["Satellite Receiver"]'::jsonb,'["Orton 4060"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('u2c-mini','Mini HD','U2C','Mini HD','Пульт цифрового ресивера',179,26,'img/products/u2c.webp','receiver',219,4,'["DVB-T2"]'::jsonb,'["U2C"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('worldvision','T624A','World Vision','T624A','Пульт цифрової приставки',199,29,'img/products/worldvision.webp','receiver',249,5,'["DVB-T2"]'::jsonb,'["World Vision"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('battery-cover-samsung','Кришка батарейного відсіку','Samsung','Кришка батарейного відсіку','Запасна кришка',99,45,'img/products/cover.webp','parts',129,5,'["Original Fit"]'::jsonb,'["Samsung BN59 Series"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('silicone-case','Силіконовий чохол','Universal','Силіконовий чохол','Захист пульта від ударів',149,54,'img/products/case.webp','parts',199,5,'["Силікон","Миючий"]'::jsonb,'["Samsung","LG","Sony"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('ir-led','IR LED','Universal','IR LED','Інфрачервоний світлодіод',39,120,'img/products/ir.webp','parts',59,5,'["3мм","940nm"]'::jsonb,'["Будь-який пульт"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('button-kit','Комплект кнопок','Universal','Комплект кнопок','Силіконові кнопки для ремонту пультів',79,72,'img/products/buttons.webp','parts',99,5,'["М''який силікон","Зносостійкі"]'::jsonb,'["Універсальні"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('remote-shell','Корпус пульта','Universal','Корпус пульта','Корпус для заміни',129,38,'img/products/shell.webp','parts',159,4,'["ABS пластик"]'::jsonb,'["Samsung","LG"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('fire-tv','Fire TV Remote','Amazon','Fire TV Remote','Bluetooth пульт',399,14,'img/products/firetv.webp','tvbox',479,5,'["Bluetooth","Voice"]'::jsonb,'["Amazon Fire TV"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('nvidia-shield','Shield TV Remote','NVIDIA','Shield TV Remote','Пульт NVIDIA Shield',599,6,'img/products/shield.webp','tvbox',699,5,'["Bluetooth","Voice","Backlight"]'::jsonb,'["NVIDIA Shield TV"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('huayu-lg','RM-L930+','HUAYU','RM-L930+','Замінник для LG',229,27,'img/products/huayu-lg.webp','universal',289,5,'["Без налаштування"]'::jsonb,'["LG LCD","LG LED"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
INSERT INTO products (sku,name,brand,model,description,price,stock,image_url,category,old_price,rating,features,compatible)
VALUES ('huayu-samsung','RM-D1078 Samsung','HUAYU','RM-D1078 Samsung','Замінник Samsung',219,32,'img/products/huayu-samsung.webp','universal',279,5,'["Plug & Play"]'::jsonb,'["Samsung TV"]'::jsonb)
ON CONFLICT (sku) DO UPDATE SET
name=EXCLUDED.name,brand=EXCLUDED.brand,model=EXCLUDED.model,description=EXCLUDED.description,
price=EXCLUDED.price,stock=EXCLUDED.stock,image_url=EXCLUDED.image_url,category=EXCLUDED.category,
old_price=EXCLUDED.old_price,rating=EXCLUDED.rating,features=EXCLUDED.features,compatible=EXCLUDED.compatible,
updated_at=NOW();
COMMIT;
SELECT COUNT(*) AS products_count FROM products;
