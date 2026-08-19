const express = require('express');
const path = require('path');
const session = require('express-session');
const app = express();

const port = 3000;

const ordersRoutes = require('./routes/orders');
const servicesRoutes = require('./routes/services');
const productsRoutes = require('./routes/products');
const authRoutes = require('./routes/auth');
const uiRoutes = require('./routes/ui');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'PULT_PLUS_DEV_SECRET_CHANGE_LATER',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 * 30 // 30 дней
    }
}));

app.use(express.static(path.join(__dirname, 'public')));

// Маршруты
app.use('/api/orders', ordersRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/auth', authRoutes);
// Dynamic UI fragments (header)
app.use('/_header', uiRoutes);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
