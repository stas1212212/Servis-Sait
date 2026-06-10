CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    client_name VARCHAR(100),
    phone VARCHAR(20),
    service VARCHAR(100),
    address TEXT,
    status VARCHAR(20) DEFAULT 'Новая',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
