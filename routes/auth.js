const express = require('express');
const bcrypt = require('bcrypt');
const { getDb } = require('../database/init');
const { requireAuth } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validate');

const router = express.Router();

router.post('/register', registerValidation, (req, res) => {
  const { first_name, last_name, email, phone, password } = req.body;
  const db = getDb();

  try {
    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR phone = ?').get(email, phone);
    if (existing) {
      db.close();
      return res.status(409).json({ error: 'Email or phone number already registered' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (first_name, last_name, email, phone, password_hash, role)
      VALUES (?, ?, ?, ?, ?, 'employee')
    `).run(first_name, last_name, email, phone, passwordHash);

    const userId = result.lastInsertRowid;
    req.session.userId = userId;
    req.session.role = 'employee';
    req.session.email = email;
    req.session.firstName = first_name;
    req.session.lastName = last_name;

    db.close();
    res.status(201).json({
      user: { id: userId, first_name, last_name, email, phone, role: 'employee' },
      redirect: '/dashboard',
    });
  } catch (err) {
    db.close();
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', loginValidation, (req, res) => {
  const { email, password } = req.body;
  const db = getDb();

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    db.close();

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.email = user.email;
    req.session.firstName = user.first_name;
    req.session.lastName = user.last_name;

    const redirects = { employee: '/dashboard', admin: '/admin', manager: '/manager' };
    res.json({
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      redirect: redirects[user.role] || '/dashboard',
    });
  } catch (err) {
    db.close();
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out' });
  });
});

router.get('/me', requireAuth, (req, res) => {
  const db = getDb();
  try {
    const user = db.prepare(`
      SELECT id, first_name, last_name, email, phone, role, created_at
      FROM users WHERE id = ?
    `).get(req.session.userId);
    db.close();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    db.close();
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;
