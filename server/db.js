const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'service_shop',
  password: 'Stas1212212',
  port: 5432,
});

module.exports = pool;
