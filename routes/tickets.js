const express = require('express');
const { getDb, enrichTicket, TICKET_SELECT, STATUSES, PRIORITIES, CATEGORIES } = require('../database/init');
const { refreshOverdue } = require('../database/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ticketCreateValidation } = require('../middleware/validate');

const router = express.Router();

function parseFilters(query) {
  return {
    search: query.search || '',
    status: query.status || '',
    priority: query.priority || '',
    category: query.category || '',
    assignee: query.assignee || '',
    dateFrom: query.dateFrom || '',
    dateTo: query.dateTo || '',
  };
}

function buildTicketQuery(baseWhere, filters, params) {
  let sql = `${TICKET_SELECT} WHERE ${baseWhere}`;
  const conditions = [];

  if (filters.search) {
    conditions.push('(CAST(t.id AS TEXT) LIKE ? OR t.title LIKE ?)');
    const term = `%${filters.search}%`;
    params.push(term, term);
  }
  if (filters.status) {
    conditions.push('t.status = ?');
    params.push(filters.status);
  }
  if (filters.priority) {
    conditions.push('t.priority = ?');
    params.push(filters.priority);
  }
  if (filters.category) {
    conditions.push('t.category = ?');
    params.push(filters.category);
  }
  if (filters.assignee === 'unassigned') {
    conditions.push('t.assigned_to IS NULL');
  } else if (filters.assignee) {
    conditions.push('t.assigned_to = ?');
    params.push(Number(filters.assignee));
  }
  if (filters.dateFrom) {
    conditions.push('date(t.created_at) >= date(?)');
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push('date(t.created_at) <= date(?)');
    params.push(filters.dateTo);
  }

  if (conditions.length) {
    sql += ' AND ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY t.updated_at DESC';
  return sql;
}

router.get('/meta', requireAuth, (req, res) => {
  res.json({ statuses: STATUSES, priorities: PRIORITIES, categories: CATEGORIES });
});

router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  refreshOverdue(db);

  try {
    const filters = parseFilters(req.query);
    const params = [];
    let baseWhere;

    if (req.session.role === 'employee') {
      baseWhere = 't.created_by = ?';
      params.push(req.session.userId);
    } else {
      baseWhere = '1=1';
    }

    const sql = buildTicketQuery(baseWhere, filters, params);
    const rows = db.prepare(sql).all(...params);
    db.close();
    res.json({ tickets: rows.map(enrichTicket) });
  } catch (err) {
    db.close();
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  refreshOverdue(db);

  try {
    const row = db.prepare(`${TICKET_SELECT} WHERE t.id = ?`).get(req.params.id);
    db.close();

    if (!row) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    if (req.session.role === 'employee' && row.created_by !== req.session.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ ticket: enrichTicket(row) });
  } catch (err) {
    db.close();
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

router.post('/', requireAuth, requireRole('employee'), ticketCreateValidation, (req, res) => {
  const { title, description, category, priority } = req.body;

  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  const ticketPriority = priority && PRIORITIES.includes(priority) ? priority : 'Medium';
  const db = getDb();

  try {
    const result = db.prepare(`
      INSERT INTO tickets (title, description, category, priority, status, created_by)
      VALUES (?, ?, ?, ?, 'ToDo', ?)
    `).run(title, description, category, ticketPriority, req.session.userId);

    const row = db.prepare(`${TICKET_SELECT} WHERE t.id = ?`).get(result.lastInsertRowid);
    db.close();
    res.status(201).json({ ticket: enrichTicket(row) });
  } catch (err) {
    db.close();
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

router.put('/:id', requireAuth, requireRole('admin'), (req, res) => {
  const { status, priority } = req.body;
  const db = getDb();

  try {
    const existing = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
    if (!existing) {
      db.close();
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const updates = [];
    const params = [];

    if (status !== undefined) {
      if (!STATUSES.includes(status)) {
        db.close();
        return res.status(400).json({ error: 'Invalid status' });
      }
      updates.push('status = ?');
      params.push(status);
    }
    if (priority !== undefined) {
      if (!PRIORITIES.includes(priority)) {
        db.close();
        return res.status(400).json({ error: 'Invalid priority' });
      }
      updates.push('priority = ?');
      params.push(priority);
    }

    if (!updates.length) {
      db.close();
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push("updated_at = datetime('now')");
    params.push(req.params.id);

    db.prepare(`UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    refreshOverdue(db);

    const row = db.prepare(`${TICKET_SELECT} WHERE t.id = ?`).get(req.params.id);
    db.close();
    res.json({ ticket: enrichTicket(row) });
  } catch (err) {
    db.close();
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

router.put('/:id/assign', requireAuth, requireRole('admin'), (req, res) => {
  const { assigned_to } = req.body;
  const db = getDb();

  try {
    const existing = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
    if (!existing) {
      db.close();
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (assigned_to === null || assigned_to === '' || assigned_to === undefined) {
      db.prepare(`
        UPDATE tickets SET assigned_to = NULL, updated_at = datetime('now') WHERE id = ?
      `).run(req.params.id);
    } else {
      const agent = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'admin'").get(assigned_to);
      if (!agent) {
        db.close();
        return res.status(400).json({ error: 'Invalid assignee. Must be an admin/support agent.' });
      }
      db.prepare(`
        UPDATE tickets SET assigned_to = ?, updated_at = datetime('now') WHERE id = ?
      `).run(assigned_to, req.params.id);

      if (existing.status === 'ToDo') {
        db.prepare(`
          UPDATE tickets SET status = 'Intake', updated_at = datetime('now') WHERE id = ?
        `).run(req.params.id);
      }
    }

    refreshOverdue(db);
    const row = db.prepare(`${TICKET_SELECT} WHERE t.id = ?`).get(req.params.id);
    db.close();
    res.json({ ticket: enrichTicket(row) });
  } catch (err) {
    db.close();
    res.status(500).json({ error: 'Failed to assign ticket' });
  }
});

router.delete('/:id', requireAuth, requireRole('admin'), (req, res) => {
  const db = getDb();
  try {
    const result = db.prepare('DELETE FROM tickets WHERE id = ?').run(req.params.id);
    db.close();
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json({ message: 'Ticket deleted' });
  } catch (err) {
    db.close();
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
});

module.exports = router;
