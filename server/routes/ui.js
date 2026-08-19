const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// GET /_header
router.get('/', (req, res) => {
    const headerPath = path.join(__dirname, '..', 'public', 'header.html');

    fs.readFile(headerPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Failed to read header.html:', err);
            return res.status(500).send('');
        }

        let out = data;

        // If user is authenticated, point login links to cabinet
        if (req.session && req.session.user) {
            out = out.replace(/href="login.html"/g, 'href="cabinet.html"');

            // Optionally show user's name in the burger menu link
            try {
                const name = (req.session.user.name || req.session.user.email || '').replace(/</g, '&lt;');
                out = out.replace('👤 Особистий кабінет', `👤 ${name}`);
            } catch (e) {
                // ignore
            }
        }

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(out);
    });
});

module.exports = router;
