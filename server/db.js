const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'service_shop',
  password: 'твой_пароль',
  port: 5432,
});

module.exports = pool;
