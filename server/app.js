const express = require('express');
const path = require('path');
const fs = require('node:fs');
const localEnv = path.join(__dirname, '.env');
if (fs.existsSync(localEnv) && typeof process.loadEnvFile === 'function') process.loadEnvFile(localEnv);
const session = require('express-session');
const app = express();
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) throw new Error('Set SESSION_SECRET before production startup');
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);

const port = Number(process.env.PORT || 3000);

const ordersRoutes = require('./routes/orders');
const servicesRoutes = require('./routes/services');
const productsRoutes = require('./routes/products');
const authRoutes = require('./routes/auth');
const repairsRoutes = require('./routes/repairs');
const adminRoutes = require('./routes/admin');
const uiRoutes = require('./routes/ui');
const experienceRoutes = require('./routes/experience');
const shippingRoutes = require('./routes/shipping');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'PULT_PLUS_DEV_SECRET_CHANGE_LATER',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 30 // 30 дней
    }
}));

app.use('/api', require('./middleware/sessionVersion'));
app.use(express.static(path.join(__dirname, 'public')));

// Маршруты
app.use('/api/orders', ordersRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/repairs', repairsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/experience', experienceRoutes);
app.use('/api/shipping', shippingRoutes);
// Dynamic UI fragments (header)
app.use('/_header', uiRoutes);

// Verify the existing database was migrated before accepting customers.
// This is read-only: no tables or user records are changed automatically.
async function startServer() {
  const pool = require('./db');
  try {
    const result = await pool.query(`
      SELECT current_database() AS db_name,
             to_regclass('users') IS NOT NULL AS has_users,
             to_regclass('service_requests') IS NOT NULL AS has_repairs,
             to_regclass('site_settings') IS NOT NULL AS has_settings,
             to_regclass('password_reset_tokens') IS NOT NULL AS has_resets,
             to_regclass('admin_notifications') IS NOT NULL AS has_notifications,
             to_regclass('repair_reviews') IS NOT NULL AS has_reviews,
             EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_schema = current_schema()
                       AND table_name = 'users' AND column_name = 'auth_version') AS has_auth_version,
             EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_schema = current_schema()
                       AND table_name = 'service_requests' AND column_name = 'tracking_code') AS has_tracking_code
    `);
    const row = result.rows[0];
    const required = [
      ['has_users', 'users'], ['has_repairs', 'service_requests'],
      ['has_settings', 'site_settings'], ['has_resets', 'password_reset_tokens'],
      ['has_notifications', 'admin_notifications'], ['has_reviews', 'repair_reviews'],
      ['has_auth_version', 'users.auth_version'], ['has_tracking_code', 'service_requests.tracking_code']
    ];
    const missing = required.filter(([key]) => !row[key]).map(([, label]) => label);
    if (missing.length) {
      console.error('\nPULT+ database migration required; connected database: ' + row.db_name);
      console.error('Missing: ' + missing.join(', '));
      console.error('Back up PostgreSQL, then open the correct database in pgAdmin and run:');
      console.error('  server/sql/customer-service-suite.sql');
      console.error('Existing accounts and orders should NOT be deleted.\n');
      process.exitCode = 1;
      await pool.end();
      return;
    }
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('PULT+ database connection / schema verification failed:', error.message);
    console.error('Check server/.env and PostgreSQL; do not recreate the database.');
    process.exitCode = 1;
    await pool.end().catch(() => {});
  }
}
startServer();
