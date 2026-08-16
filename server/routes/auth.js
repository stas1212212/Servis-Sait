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

        // Проверяем данные
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Заповніть усі поля"
            });
        }

        // Проверяем минимальную длину пароля
        if (password.length < 6) {
            return res.status(400).json({
                message: "Пароль повинен містити щонайменше 6 символів"
            });
        }

        // Проверяем, существует ли пользователь
        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "Користувач з таким email вже існує"
            });
        }

        // Создаём хэш пароля
        const passwordHash = await bcrypt.hash(password, 10);

        // Создаём пользователя
        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, name, email, created_at`,
            [name, email, passwordHash]
        );

        res.status(201).json({
            message: "Реєстрація успішна",
            user: result.rows[0]
        });

    } catch (error) {

        console.error("Registration error:", error);

        res.status(500).json({
            message: "Помилка сервера"
        });

    }
});

module.exports = router;