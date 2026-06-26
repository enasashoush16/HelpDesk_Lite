# HelpDesk Lite

A lightweight internal ticket management system built with Node.js, Express, SQLite, and vanilla JavaScript.

## Features

- Session-based authentication with bcrypt password hashing
- Three roles: Employee, Admin, Manager
- Full ticket lifecycle: ToDo → Intake → In Progress → Review → Done
- Manual ticket assignment by admins
- Role-based dashboards with KPIs and charts
- Search and filtering on all ticket tables
- Automatic overdue detection (3+ days unresolved)

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- npm (included with Node.js)

## Installation

1. Clone or download this repository.
2. Install dependencies:

```bash
npm install
```

1. Copy the environment file and configure it:

```bash
copy .env.example .env
```

Edit `.env` and set a strong `SESSION_SECRET` for production.

1. Initialize the database (also runs automatically on first start):

```bash
npm run init-db
```

## Running the Application

Start the server:

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Default Accounts

The database seed creates three accounts (password for all:`password123`):


| Email                                                   | Role                  |
| ------------------------------------------------------- | --------------------- |
| [admin@helpdesk.local](mailto:admin@helpdesk.local)     | Admin                 |
| [agent@helpdesk.local](mailto:agent@helpdesk.local)     | Admin (support agent) |
| [manager@helpdesk.local](mailto:manager@helpdesk.local) | Manager               |


Employees register via the registration page at `/register`.

## Environment Variables


| Variable         | Description            | Default                  |
| ---------------- | ---------------------- | ------------------------ |
| `PORT`           | Server port            | `3000`                   |
| `SESSION_SECRET` | Session signing secret | (required in production) |
| `NODE_ENV`       | Environment mode       | `development`            |


## Project Structure

```
helpdesk-lite/
├── database/
│   └── init.js          # Database schema and seed data
├── middleware/
│   ├── auth.js          # Session and role guards
│   └── validate.js      # Input validation
├── public/
│   ├── css/styles.css   # Application styles
│   ├── js/              # Frontend JavaScript
│   └── *.html           # Page templates
├── routes/
│   ├── auth.js          # Registration, login, logout
│   ├── tickets.js       # Ticket CRUD and assignment
│   ├── dashboard.js     # Dashboard statistics
│   └── users.js         # User listing
├── server.js            # Express application entry
├── README.md
└── CHANGES.md
```

## API Endpoints

### Authentication

- `POST /api/auth/register` — Employee registration
- `POST /api/auth/login` — Login
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Current user

### Tickets

- `GET /api/tickets` — List tickets (role-filtered)
- `GET /api/tickets/:id` — Ticket detail
- `POST /api/tickets` — Create ticket (employee)
- `PUT /api/tickets/:id` — Update status/priority (admin)
- `PUT /api/tickets/:id/assign` — Assign/reassign (admin)
- `DELETE /api/tickets/:id` — Delete ticket (admin)

### Dashboard

- `GET /api/dashboard/employee`
- `GET /api/dashboard/admin`
- `GET /api/dashboard/manager`

## License

MIT