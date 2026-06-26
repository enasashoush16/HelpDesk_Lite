const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// we comment out the DB_PATH constant to use a dynamic path based on the environment

// const DB_PATH = path.join(__dirname, 'helpdesk.db');

// we added this line to define a dynamic path for the database file based on the environment to depoly to vercel and use a temporary file in production
const isVercel = process.env.VERCEL || process.env.NODE_ENV === 'production';
const DB_PATH = isVercel
  ? '/tmp/helpdesk.db'
  : path.join(__dirname, 'helpdesk.db');

console.log(`[Database Setup] Targeting runtime path: ${DB_PATH}`);
//=======================


let SQL = null;
let dbInstance = null;

//we added the following function to safely save the database without crashing Vercel on failure
function saveDatabase() {
  if (!dbInstance) return;
  const data = dbInstance.export();
  
  try {
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (error) {
    console.error(`CRITICAL: Failed writing database file to ${DB_PATH}. Error:`, error);
  }
}

// we comment out the saveDatabase function to prevent Vercel from crashing on database write failure

// function saveDatabase() {
//   if (!dbInstance) return;
//   const data = dbInstance.export();
//   fs.writeFileSync(DB_PATH, Buffer.from(data));
// }



function createStatement(sql) {
  return {
    run(...params) {
      const stmt = dbInstance.prepare(sql);
      try {
        stmt.run(params);
        const idRow = dbInstance.exec('SELECT last_insert_rowid()');
        const changes = dbInstance.getRowsModified();
        saveDatabase();
        return {
          lastInsertRowid: idRow[0]?.values[0]?.[0] ?? 0,
          changes,
        };
      } finally {
        stmt.free();
      }
    },
    get(...params) {
      const stmt = dbInstance.prepare(sql);
      try {
        if (params.length) stmt.bind(params);
        if (stmt.step()) {
          return stmt.getAsObject();
        }
        return undefined;
      } finally {
        stmt.free();
      }
    },
    all(...params) {
      const stmt = dbInstance.prepare(sql);
      const rows = [];
      try {
        if (params.length) stmt.bind(params);
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        return rows;
      } finally {
        stmt.free();
      }
    },
  };
}

function getDb() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return {
    prepare: createStatement,
    exec(sql) {
      dbInstance.run(sql);
      saveDatabase();
    },
    close() {
      saveDatabase();
    },
  };
}

async function initDatabase() {
  if (!SQL) {
    SQL = await initSqlJs();
  }

  if (fs.existsSync(DB_PATH)) {
    dbInstance = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    dbInstance = new SQL.Database();
  }

  dbInstance.run('PRAGMA foreign_keys = ON');

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('employee', 'admin', 'manager')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'Medium',
      status TEXT NOT NULL DEFAULT 'ToDo',
      created_by INTEGER NOT NULL,
      assigned_to INTEGER,
      overdue INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id)
    )
  `);

  dbInstance.run('CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by)');
  dbInstance.run('CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to)');
  dbInstance.run('CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)');

  seedUsers(getDb());
  updateOverdueTickets(getDb());
  saveDatabase();

  console.log('Database initialized at', DB_PATH);
}

function seedUsers(db) {
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count > 0) return;

  const bcrypt = require('bcrypt');
  const insert = db.prepare(`
    INSERT INTO users (first_name, last_name, email, phone, password_hash, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const password = bcrypt.hashSync('password123', 10);

  insert.run('System', 'Admin', 'admin@helpdesk.local', '+10000000001', password, 'admin');
  insert.run('Support', 'Agent', 'agent@helpdesk.local', '+10000000002', password, 'admin');
  insert.run('Operations', 'Manager', 'manager@helpdesk.local', '+10000000003', password, 'manager');

  console.log('Seeded default users (password: password123):');
  console.log('  admin@helpdesk.local (admin)');
  console.log('  agent@helpdesk.local (admin/support agent)');
  console.log('  manager@helpdesk.local (manager)');
}

function updateOverdueTickets(db) {
  db.prepare(`
    UPDATE tickets
    SET overdue = 1, updated_at = datetime('now')
    WHERE status != 'Done'
      AND julianday('now') - julianday(created_at) > 3
      AND overdue = 0
  `).run();
}

function enrichTicket(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    priority: row.priority,
    status: row.status,
    created_by: row.created_by,
    assigned_to: row.assigned_to,
    created_by_name: row.created_by_name || null,
    assigned_to_name: row.assigned_to_name || null,
    overdue: Boolean(row.overdue),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const STATUSES = ['ToDo', 'Intake', 'In Progress', 'Review', 'Done'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const CATEGORIES = [
  'IT Support',
  'Hardware',
  'Software',
  'Network',
  'Access Request',
  'HR Request',
  'Finance Request',
  'Facilities',
  'Other',
];

const TICKET_SELECT = `
  SELECT
    t.*,
    cb.first_name || ' ' || cb.last_name AS created_by_name,
    CASE WHEN t.assigned_to IS NOT NULL
      THEN at.first_name || ' ' || at.last_name
      ELSE NULL
    END AS assigned_to_name
  FROM tickets t
  JOIN users cb ON cb.id = t.created_by
  LEFT JOIN users at ON at.id = t.assigned_to
`;

module.exports = {
  DB_PATH,
  STATUSES,
  PRIORITIES,
  CATEGORIES,
  initDatabase,
  getDb,
  enrichTicket,
  TICKET_SELECT,
  updateOverdueTickets,
};

// we comment out the following block to prevent Vercel from crashing on database initialization failure
// if (require.main === module) {
//   initDatabase().catch(console.error);
// }

// we add the following block to safely initialize the database without crashing Vercel on failure
// Remove or change the old if condition block at the bottom to just this:
module.exports = {
  DB_PATH,
  STATUSES,
  PRIORITIES,
  CATEGORIES,
  initDatabase,
  getDb,
  enrichTicket,
  TICKET_SELECT,
  updateOverdueTickets,
};