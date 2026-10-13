const express = require('express');
const path = require('path');
const fs = require('node:fs');
const localEnv = path.join(__dirname, '.env');
if (fs.existsSync(localEnv) && typeof process.loadEnvFile === 'function') process.loadEnvFile(localEnv);
const session = require('express-session');
const app = express();

const port = Number(process.env.PORT || 3000);

const ordersRoutes = require('./routes/orders');
const servicesRoutes = require('./routes/services');
const productsRoutes = require('./routes/products');
const authRoutes = require('./routes/auth');
const repairsRoutes = require('./routes/repairs');
const adminRoutes = require('./routes/admin');
const uiRoutes = require('./routes/ui');
const experienceRoutes = require('./routes/experience');

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
// Dynamic UI fragments (header)
app.use('/_header', uiRoutes);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
