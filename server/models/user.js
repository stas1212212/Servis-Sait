const pool = require("../db");

async function getUserById(id) {
    const result = await pool.query(
        `SELECT id, name, email, created_at
         FROM users
         WHERE id = $1`,
        [id]
    );

    return result.rows[0] || null;
}

async function updateUser(id, name, email) {
    const result = await pool.query(
        `UPDATE users
         SET name = $1,
             email = $2
         WHERE id = $3
         RETURNING id, name, email, created_at`,
        [name, email, id]
    );

    return result.rows[0] || null;
}

module.exports = {
    getUserById,
    updateUser
};