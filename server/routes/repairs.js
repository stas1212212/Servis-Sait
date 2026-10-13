const express = require("express");
const pool = require("../db");
const crypto = require("node:crypto");

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const {
            name,
            phone,
            email,
            device_type,
            brand,
            model,
            issue,
            issue_cause,
            repair_type
        } = req.body;

        if (!name || !phone || !device_type || !issue) {
            return res.status(400).json({
                message: "Заповніть обов'язкові поля"
            });
        }

        const cleanName = name.trim();
        const cleanPhone = phone.trim();
        const cleanEmail = email
            ? email.trim().toLowerCase()
            : null;

        const cleanDeviceType = device_type.trim();
        const cleanBrand = brand ? brand.trim() : null;
        const cleanModel = model ? model.trim() : null;
        const cleanIssue = issue.trim();
        const cleanIssueCause = issue_cause
            ? issue_cause.trim()
            : null;
        const cleanRepairType = repair_type
            ? repair_type.trim()
            : null;

        if (cleanName.length < 2) {
            return res.status(400).json({
                message: "Введіть коректне ім'я"
            });
        }

        if (cleanPhone.length < 5) {
            return res.status(400).json({
                message: "Введіть коректний номер телефону"
            });
        }

        const userId =
            req.session &&
            req.session.user
                ? req.session.user.id
                : null;

        const trackingCode = "RP-" + crypto.randomBytes(12).toString("hex").toUpperCase();
        const result = await pool.query(
            `INSERT INTO service_requests
            (
                name,
                phone,
                email,
                device_type,
                brand,
                model,
                issue,
                issue_cause,
                repair_type,
                status,
                user_id,
                tracking_code
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                'pending',
                $10,
                $11
            )
            RETURNING
                id,
                name,
                phone,
                email,
                device_type,
                brand,
                model,
                issue,
                issue_cause,
                repair_type,
                status,
                user_id,
                tracking_code,
                created_at`,
            [
                cleanName,
                cleanPhone,
                cleanEmail,
                cleanDeviceType,
                cleanBrand,
                cleanModel,
                cleanIssue,
                cleanIssueCause,
                cleanRepairType,
                userId,
                trackingCode
            ]
        );

        // An in-app notification; if unavailable, the saved repair must not be lost.
        try {
            await pool.query("INSERT INTO admin_notifications(kind,ref_id,message) VALUES($1,$2,$3)",
                ["repair", result.rows[0].id, "Нова заявка на ремонт №" + result.rows[0].id]);
        } catch (notificationError) {
            console.error("Admin repair notification failed:", notificationError);
        }

        res.status(201).json({
            message: "Заявку успішно створено",
            request: result.rows[0]
        });

    } catch (error) {
        console.error("POST /api/repairs error:", error);

        res.status(500).json({
            message: "Помилка сервера"
        });
    }
});

router.get("/mine", async (req, res) => {
    const userId = req.session?.user?.id;
    if (!userId) {
        return res.status(401).json({ message: "Потрібна авторизація" });
    }
    try {
        const result = await pool.query(
            `SELECT id, tracking_code, device_type, brand, model, issue, repair_type, status, created_at
             FROM service_requests
             WHERE user_id = $1
             ORDER BY created_at DESC, id DESC`,
            [userId]
        );
        return res.json({ requests: result.rows });
    } catch (error) {
        console.error("GET /api/repairs/mine error:", error);
        return res.status(500).json({ message: "Помилка сервера" });
    }
});

module.exports = router;