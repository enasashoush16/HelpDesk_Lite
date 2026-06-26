# CHANGES.md — Assumptions, Decisions & Enhancements

This document records clarifications made during implementation where the PRD was ambiguous, incomplete, or contradictory.

---

## Contradictions Resolved

### 1. Status Lifecycle vs. Status Colors

**PRD conflict:** The ticket lifecycle lists `ToDo → Intake → In Progress → Review → Done`, but the status color section references `Assigned` (Blue) instead of `ToDo`.

**Decision:** Use the five lifecycle states from the workflow section. `ToDo` is styled gray (same family as Intake). Assignment is tracked via the `assigned_to` field, not a separate status. When an admin assigns a ticket in `ToDo` status, it automatically moves to `Intake`.

### 2. "Assigned" Status Color

**PRD reference:** Assigned = Blue.

**Decision:** Applied as a visual indicator on the assignee field and user role badges, not as a ticket workflow status.

---

## Assumptions Made

### 3. Admin and Manager Account Creation

**Gap:** PRD allows Employee registration but not Admin/Manager registration.

**Decision:** Admin and Manager accounts are seeded during database initialization. See README for default credentials. Only employees can self-register.

### 4. Support Agent / Assignee Role

**Gap:** PRD says admins assign tickets to "support agents" but only defines Employee, Admin, and Manager roles.

**Decision:** Users with the `admin` role are treated as support agents and appear in assignment dropdowns. The seed includes two admin accounts (admin + agent) to demonstrate assignment.

### 5. Ticket Priority on Creation

**Gap:** Priority is in the ticket data structure but not in the employee creation form.

**Decision:** New tickets default to `Medium` priority. Admins can change priority from the ticket detail view.

### 6. Ticket DELETE Permission

**Gap:** DELETE endpoint is listed but no role permission is specified.

**Decision:** Only admins can delete tickets via the API. No delete button is exposed in the UI for V1 to avoid accidental data loss.

### 7. Admin "Users" Page

**Gap:** Navigation includes Users but no user-management API is defined.

**Decision:** Read-only user listing showing all registered users. No create/edit/delete user functionality in V1.

### 8. Admin "Assignments" Page

**Gap:** Separate Assignments nav item with no distinct API.

**Decision:** Dedicated page showing unassigned tickets (with inline assign) and assigned tickets (with reassign/remove). Uses existing assignment API.

### 9. Manager "Reports" and "Analytics" Pages

**Gap:** Separate nav items with overlapping content vs. dashboard charts.

**Decision:**
- **Dashboard** — Full KPI cards, all three charts, and workload table.
- **Reports** — KPI summary, status/category charts, and filterable ticket table.
- **Analytics** — Assignee chart, priority breakdown, workload table, and overdue ticket list.

### 10. Open Tickets Definition

**Gap:** Employee dashboard shows "Open Tickets" without a definition.

**Decision:** Open = any ticket where status is not `Done`.

### 11. Overdue Calculation

**PRD:** Overdue if unresolved for more than 3 days.

**Decision:** Overdue flag is set when `created_at` is more than 3 calendar days ago and status is not `Done`. Checked on every ticket list/detail/dashboard request. Overdue badge hidden on completed tickets.

### 12. Employee Ticket Updates

**Gap:** Employees can "receive updates on assigned tickets" but cannot change status.

**Decision:** Employees have read-only access to their own tickets, including assignment and status changes made by admins.

### 13. Attachment Field

**PRD:** Optional attachment marked as future enhancement.

**Decision:** Placeholder UI shown on create ticket form with "coming in a future release" message. No backend support.

### 14. Created By Name / Assigned To Name

**PRD:** Stored in ticket data structure.

**Decision:** Names are joined from the users table at query time rather than denormalized in the tickets table, keeping data consistent when user names change.

### 15. Status Flow Enforcement

**Gap:** PRD defines flow order but not whether skipping steps is allowed.

**Decision:** Admins can set any valid status directly (no strict transition enforcement) for operational flexibility in V1.

---

## Enhancements Beyond PRD

1. **Landing page** at `/` with sign-in/register links and auto-redirect for authenticated users.
2. **Profile page** for employees showing account details.
3. **Modal dialogs** on admin ticket table for quick status/assignment changes.
4. **Responsive sidebar layout** that stacks on mobile.
5. **Debounced search** in filter bars for better UX.
6. **Priority chart** on Manager Analytics page (not in PRD but supports reporting).
7. **Auto database initialization** on server start so `npm start` works without a separate init step.

---

## Technology Choices

| Area | Choice | Reason |
|---|---|---|
| SQLite driver | sql.js | Pure JavaScript/WASM — no native build tools required on Windows |
| Session store | express-session (memory) | Sufficient for V1 single-instance deployment |
| Validation | express-validator | Structured server-side validation |
| Charts | Canvas API (vanilla JS) | No external chart library dependency |
| Frontend | Multi-page HTML | Matches PRD stack requirement (HTML/CSS/vanilla JS) |

---

## Out of Scope (Confirmed)

Per PRD Version 1 scope, the following are intentionally excluded:

- Email notifications
- Knowledge base
- SLA automation
- Auto-escalation
- Round-robin assignment
- File uploads
- Audit logs
- Multi-company support
- Mobile app
