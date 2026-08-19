const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../db");

const router = express.Router();

// =========================
// Регистрация
// POST /api/auth/register
// =========================

router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;


        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Заповніть усі поля"
            });
        }


        if (password.length < 6) {
            return res.status(400).json({
                message: "Пароль повинен містити щонайменше 6 символів"
            });
        }


        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "Користувач з таким email вже існує"
            });
        }

    
        const passwordHash = await bcrypt.hash(password, 10);


        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, name, email, created_at`,
            [name, email, passwordHash]
        );

        const user = result.rows[0];

        // Сразу создаём авторизованную сессию
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email
        };

        res.status(201).json({
            message: "Реєстрація успішна",
            user: req.session.user
        });

    } catch (error) {
        
        console.error("Registration error:", error);

        res.status(500).json({
            message: "Помилка сервера"
        });
    }
});


// =========================
// Вход
// POST /api/auth/login
// =========================

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Введіть email та пароль"
            });
        }

        const result = await pool.query(
            `SELECT id, name, email, password_hash
             FROM users
             WHERE email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Невірний email або пароль"
            });
        }

        const user = result.rows[0];

        const passwordCorrect = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordCorrect) {
            return res.status(401).json({
                message: "Невірний email або пароль"
            });
        }

        // ВАЖНО:
        // сохраняем пользователя в серверной сессии
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email
        };

        res.json({
            message: "Вхід успішний",
            user: req.session.user
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            message: "Помилка сервера"
        });
    }
});


// =========================
// Текущий пользователь
// GET /api/auth/me
// =========================

router.get("/me", (req, res) => {

    if (!req.session.user) {
        return res.status(401).json({
            message: "Користувач не авторизований"
        });
    }

    res.json({
        user: req.session.user
    });
});


// =========================
// Выход
// POST /api/auth/logout
// =========================

router.post("/logout", (req, res) => {

    req.session.destroy((error) => {

        if (error) {
            console.error("Logout error:", error);

            return res.status(500).json({
                message: "Не вдалося вийти з акаунта"
            });
        }

        res.clearCookie("connect.sid");

        res.json({
            message: "Ви вийшли з акаунта"
        });
    });
});


module.exports = router;