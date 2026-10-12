const express = require("express");
const pool = require("../db");
const requireAdmin = require("../middleware/requireAdmin");
const router = express.Router();

router.use(requireAdmin);

router.get("/repairs", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, phone, email, device_type, brand, model, issue,
              issue_cause, repair_type, status, user_id, created_at
       FROM service_requests ORDER BY created_at DESC, id DESC LIMIT 300`
    );
    res.json({ requests: result.rows });
  } catch (error) {
    console.error("Admin repairs list error:", error);
    res.status(500).json({ message: "Не вдалося завантажити заявки" });
  }
});

router.patch("/repairs/:id/status", async (req, res) => {
  const origin = req.get("origin");
  if (origin && origin !== `${req.protocol}://${req.get("host")}`) {
    return res.status(403).json({ message: "Недозволене джерело запиту" });
  }
  const id = Number(req.params.id);
  const statuses = ["pending", "in_progress", "waiting_parts", "completed", "cancelled"];
  const status = req.body?.status;
  if (!Number.isSafeInteger(id) || id < 1 || !statuses.includes(status)) {
    return res.status(400).json({ message: "Некоректний номер або статус заявки" });
  }
  try {
    const result = await pool.query(
      "UPDATE service_requests SET status = $1 WHERE id = $2 RETURNING id, status",
      [status, id]
    );
    if (!result.rowCount) return res.status(404).json({ message: "Заявку не знайдено" });
    res.json({ request: result.rows[0] });
  } catch (error) {
    console.error("Admin repair status update error:", error);
    res.status(500).json({ message: "Не вдалося оновити статус" });
  }
});

module.exports = router;
