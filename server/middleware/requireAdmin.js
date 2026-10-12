const pool = require("../db");

async function requireAdmin(req, res, next) {
  const userId = req.session?.user?.id;
  if (!userId) return res.status(401).json({ message: "Потрібна авторизація" });
  try {
    const result = await pool.query("SELECT role FROM users WHERE id = $1", [userId]);
    if (result.rows[0]?.role !== "admin") {
      return res.status(403).json({ message: "Доступ заборонено" });
    }
    next();
  } catch (error) {
    console.error("Admin access check error:", error);
    res.status(500).json({ message: "Помилка перевірки доступу" });
  }
}

module.exports = requireAdmin;
