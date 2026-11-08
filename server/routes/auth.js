const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../db");
const {sameOrigin,consume,clear,regenerate}=require("../auth-security");

const {
    getUserById,
    updateUser
} = require("../models/user");

const router = express.Router();

// =========================
// Регистрация
// POST /api/auth/register
// =========================

router.post("/register",sameOrigin, async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if(typeof name!=="string"||typeof email!=="string"||typeof password!=="string"||
           name.trim().length<2||name.trim().length>100||email.length>254||
           !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
          return res.status(400).json({message:"Перевірте ім’я, email та пароль"});
        const cleanName=name.trim(),cleanEmail=email.trim().toLowerCase();
        if(!await consume("register-ip:"+req.ip,8,60))return res.status(429).json({message:"Забагато спроб реєстрації. Спробуйте пізніше"});


        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Заповніть усі поля"
            });
        }


        if (password.length < 10 || password.length > 72) {
            return res.status(400).json({
                message: "Пароль повинен містити від 10 до 72 символів"
            });
        }


        const existingUser = await pool.query(
            "SELECT id FROM users WHERE lower(email) = $1",
            [cleanEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "Користувач з таким email вже існує"
            });
        }

    
        const passwordHash = await bcrypt.hash(password, 12);


        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, name, email, created_at, auth_version`,
            [cleanName, cleanEmail, passwordHash]
        );

        const user = result.rows[0];

        // Сразу создаём авторизованную сессию
        await regenerate(req,user);

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

router.post("/login",sameOrigin, async (req, res) => {
    try {
        const { email, password } = req.body;

        if(typeof email!=="string"||typeof password!=="string"||email.length>254||password.length>1024)
          return res.status(400).json({message:"Некоректні дані входу"});
        const cleanEmail=email.trim().toLowerCase();
        if (!cleanEmail || !password) {
            return res.status(400).json({
                message: "Введіть email та пароль"
            });
        }

        if(!await consume("login-ip:"+req.ip,25,15)||!await consume("login-account:"+cleanEmail,10,15))
          return res.status(429).json({message:"Забагато спроб входу. Спробуйте пізніше"});
        const result = await pool.query(
            `SELECT id, name, email, password_hash, auth_version
             FROM users
             WHERE lower(email) = $1`,
            [cleanEmail]
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
        await regenerate(req,user);
        await clear("login-account:"+cleanEmail);

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

router.get("/me", async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({
                message: "Користувач не авторизований"
            });
        }

        const user = await getUserById(req.session.user.id);

        if (!user) {
            req.session.destroy(() => {});

            return res.status(401).json({
                message: "Користувача не знайдено"
            });
        }

        // Обновляем данные в сессии
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            auth_version: user.auth_version
        };

        res.json({
            user
        });

    } catch (error) {
        console.error("Get current user error:", error);

        res.status(500).json({
            message: "Помилка сервера"
        });
    }
});


// =========================
// Изменение профиля
// PUT /api/auth/profile
// =========================

router.put("/profile",sameOrigin, async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({
                message: "Користувач не авторизований"
            });
        }

        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                message: "Заповніть усі поля"
            });
        }

        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (cleanName.length < 2) {
            return res.status(400).json({
                message: "Ім'я занадто коротке"
            });
        }

        if (!cleanEmail.includes("@")) {
            return res.status(400).json({
                message: "Введіть коректний email"
            });
        }

        // Проверяем, не занят ли email другим пользователем
        const existing = await pool.query(
            `SELECT id
             FROM users
             WHERE email = $1
             AND id != $2`,
            [cleanEmail, req.session.user.id]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({
                message: "Цей email вже використовується"
            });
        }

        const user = await updateUser(
            req.session.user.id,
            cleanName,
            cleanEmail
        );

        if (!user) {
            return res.status(404).json({
                message: "Користувача не знайдено"
            });
        }

        // Обновляем сессию
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            auth_version: user.auth_version
        };

        res.json({
            message: "Профіль оновлено",
            user
        });

    } catch (error) {
        console.error("Update profile error:", error);

        res.status(500).json({
            message: "Помилка сервера"
        });
    }
});


// =========================
// Выход
// POST /api/auth/logout
// =========================

router.post("/logout",sameOrigin, (req, res) => {
    req.session.destroy((error) => {

        if (error) {
            console.error("Logout error:", error);

            return res.status(500).json({
                message: "Не вдалося вийти з акаунта"
            });
        }

        res.clearCookie("pult.sid");

        res.json({
            message: "Ви вийшли з акаунта"
        });
    });
});

module.exports = router;