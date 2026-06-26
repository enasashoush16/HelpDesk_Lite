const express = require('express');
const { getDb } = require('../database/init');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, requireRole('admin'), (req, res) => {
  const db = getDb();
  try {
    const users = db.prepare(`
      SELECT id, first_name, last_name, email, phone, role, created_at
      FROM users ORDER BY role, last_name
    `).all();

    const agents = db.prepare(`
      SELECT id, first_name, last_name, email
      FROM users WHERE role = 'admin' ORDER BY last_name
    `).all();

    db.close();
    res.json({ users, agents });
  } catch (err) {
    db.close();
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/agents', requireAuth, requireRole('admin', 'manager'), (req, res) => {
  const db = getDb();
  try {
    const agents = db.prepare(`
      SELECT id, first_name, last_name, email
      FROM users WHERE role = 'admin' ORDER BY last_name
    `).all();
    db.close();
    res.json({ agents });
  } catch (err) {
    db.close();
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

module.exports = router;
