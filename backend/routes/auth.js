// routes/auth.js — Admin authentication routes
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');
const { loginLimiter, changePasswordLimiter } = require('../middleware/rateLimiters');
const { logAudit } = require('../middleware/auditLog');

function getValidExpiresIn(raw) {
  if (!raw) return '24h';
  const cleaned = String(raw).replace(/^['"\s]+|['"\s]+$/g, '').trim();
  if (/^\d+$/.test(cleaned)) {
    return parseInt(cleaned, 10);
  }
  if (/^\d+\s*(ms|s|m|h|d|w|y)$/i.test(cleaned)) {
    return cleaned;
  }
  return '24h';
}

// POST /api/auth/login — Admin authentication
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const cleanUsername = String(username).trim();
    const admin = await db.get('SELECT * FROM `admins` WHERE LOWER(`username`) = LOWER(?)', [cleanUsername]);

    if (!admin) {
      logAudit(req, { event: 'auth.login', actor: cleanUsername, success: false, detail: 'unknown username' });
      return res.status(401).json({ error: 'Invalid administrator credentials.' });
    }

    const isMatch = bcrypt.compareSync(password, admin.password_hash);
    if (!isMatch) {
      logAudit(req, { event: 'auth.login', actor: admin.username, success: false, detail: 'wrong password' });
      return res.status(401).json({ error: 'Invalid administrator credentials.' });
    }

    const expiresIn = getValidExpiresIn(process.env.JWT_EXPIRES_IN);
    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        role: 'admin',
      },
      JWT_SECRET,
      { expiresIn }
    );

    logAudit(req, { event: 'auth.login', actor: admin.username, success: true });

    res.json({
      token,
      user: {
        id: admin.id,
        username: admin.username,
        role: 'admin',
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me — Check session validity
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const admin = await db.get('SELECT `id`, `username`, `created_at` FROM `admins` WHERE `id` = ?', [req.user.id]);
    if (!admin) {
      return res.status(404).json({ error: 'Admin account no longer exists.' });
    }
    res.json({
      authenticated: true,
      user: {
        id: admin.id,
        username: admin.username,
        role: 'admin',
        created_at: admin.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/change-password — Update admin password
router.post('/change-password', requireAuth, changePasswordLimiter, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const admin = await db.get('SELECT * FROM `admins` WHERE `id` = ?', [req.user.id]);
    if (!admin) {
      return res.status(404).json({ error: 'Admin account not found.' });
    }

    const isMatch = bcrypt.compareSync(currentPassword, admin.password_hash);
    if (!isMatch) {
      logAudit(req, { event: 'auth.change_password', actor: admin.username, success: false, detail: 'wrong current password' });
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(newPassword, salt);

    await db.run('UPDATE `admins` SET `password_hash` = ? WHERE `id` = ?', [newHash, admin.id]);
    logAudit(req, { event: 'auth.change_password', actor: admin.username, success: true });

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
