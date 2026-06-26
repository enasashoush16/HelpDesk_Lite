const express = require('express');
const { getDb } = require('../database/init');
const { refreshOverdue } = require('../database/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/employee', requireAuth, requireRole('employee'), (req, res) => {
  const db = getDb();
  refreshOverdue(db);
  const userId = req.session.userId;

  try {
    const stats = db.prepare(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN status != 'Done' THEN 1 ELSE 0 END), 0) AS open,
        COALESCE(SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END), 0) AS in_progress,
        COALESCE(SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END), 0) AS completed
      FROM tickets WHERE created_by = ?
    `).get(userId);

    db.close();
    res.json({ stats });
  } catch (err) {
    db.close();
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

router.get('/admin', requireAuth, requireRole('admin'), (req, res) => {
  const db = getDb();
  refreshOverdue(db);

  try {
    const stats = db.prepare(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN assigned_to IS NULL THEN 1 ELSE 0 END), 0) AS unassigned,
        COALESCE(SUM(CASE WHEN assigned_to IS NOT NULL THEN 1 ELSE 0 END), 0) AS assigned,
        COALESCE(SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END), 0) AS in_progress,
        COALESCE(SUM(CASE WHEN status = 'Review' THEN 1 ELSE 0 END), 0) AS review,
        COALESCE(SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END), 0) AS completed
      FROM tickets
    `).get();

    db.close();
    res.json({ stats });
  } catch (err) {
    db.close();
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

router.get('/manager', requireAuth, requireRole('manager'), (req, res) => {
  const db = getDb();
  refreshOverdue(db);

  try {
    const stats = db.prepare(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN status = 'Intake' THEN 1 ELSE 0 END), 0) AS intake,
        COALESCE(SUM(CASE WHEN assigned_to IS NOT NULL THEN 1 ELSE 0 END), 0) AS assigned,
        COALESCE(SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END), 0) AS in_progress,
        COALESCE(SUM(CASE WHEN status = 'Review' THEN 1 ELSE 0 END), 0) AS review,
        COALESCE(SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END), 0) AS done,
        COALESCE(SUM(CASE WHEN overdue = 1 THEN 1 ELSE 0 END), 0) AS overdue,
        COALESCE(SUM(CASE WHEN assigned_to IS NULL THEN 1 ELSE 0 END), 0) AS unassigned
      FROM tickets
    `).get();

    const byStatus = db.prepare(`
      SELECT status, COUNT(*) AS count FROM tickets GROUP BY status
    `).all();

    const byCategory = db.prepare(`
      SELECT category, COUNT(*) AS count FROM tickets GROUP BY category
    `).all();

    const byAssignee = db.prepare(`
      SELECT
        COALESCE(u.first_name || ' ' || u.last_name, 'Unassigned') AS name,
        COUNT(*) AS count
      FROM tickets t
      LEFT JOIN users u ON u.id = t.assigned_to
      GROUP BY t.assigned_to
    `).all();

    const workload = db.prepare(`
      SELECT
        u.id,
        u.first_name || ' ' || u.last_name AS name,
        SUM(CASE WHEN t.id IS NOT NULL THEN 1 ELSE 0 END) AS assigned_count,
        SUM(CASE WHEN t.status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress_count,
        SUM(CASE WHEN t.status = 'Done' THEN 1 ELSE 0 END) AS completed_count
      FROM users u
      LEFT JOIN tickets t ON t.assigned_to = u.id
      WHERE u.role = 'admin'
      GROUP BY u.id
    `).all();

    db.close();
    res.json({ stats, byStatus, byCategory, byAssignee, workload });
  } catch (err) {
    db.close();
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

module.exports = router;
