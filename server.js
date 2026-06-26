require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { initDatabase } = require('./database/init');
const { attachUser } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const dashboardRoutes = require('./routes/dashboard');
const userRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

app.use(attachUser);

app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);

app.use(express.static(path.join(__dirname, 'public')));

const pages = {
  '/': 'index.html',
  '/login': 'login.html',
  '/register': 'register.html',
  '/dashboard': 'dashboard.html',
  '/my-tickets': 'my-tickets.html',
  '/create-ticket': 'create-ticket.html',
  '/profile': 'profile.html',
  '/ticket': 'ticket-detail.html',
  '/admin': 'admin.html',
  '/admin/tickets': 'admin-tickets.html',
  '/admin/assignments': 'admin-assignments.html',
  '/admin/users': 'admin-users.html',
  '/manager': 'manager.html',
  '/manager/reports': 'manager-reports.html',
  '/manager/analytics': 'manager-analytics.html',
};

Object.entries(pages).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', file));
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});


initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`HelpDesk Lite running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
