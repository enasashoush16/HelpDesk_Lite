const STATUS_CLASSES = {
  'ToDo': 'badge-todo',
  'Intake': 'badge-intake',
  'In Progress': 'badge-in-progress',
  'Review': 'badge-review',
  'Done': 'badge-done',
};

const PRIORITY_CLASSES = {
  Low: 'badge-priority-low',
  Medium: 'badge-priority-medium',
  High: 'badge-priority-high',
  Critical: 'badge-priority-critical',
};

function statusBadge(status) {
  const cls = STATUS_CLASSES[status] || 'badge-todo';
  return `<span class="badge ${cls}">${escapeHtml(status)}</span>`;
}

function priorityBadge(priority) {
  const cls = PRIORITY_CLASSES[priority] || 'badge-priority-medium';
  return `<span class="badge ${cls}">${escapeHtml(priority)}</span>`;
}

function overdueBadge(ticket) {
  if (!ticket.overdue || ticket.status === 'Done') return '';
  return '<span class="badge badge-overdue">⚠ Overdue</span>';
}

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
  return d.toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z');
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function buildQueryParams(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (val) params.set(key, val);
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function renderSidebar(role, activePage, user) {
  const menus = {
    employee: [
      { href: '/dashboard', label: 'Dashboard', page: 'dashboard' },
      { href: '/my-tickets', label: 'My Tickets', page: 'my-tickets' },
      { href: '/create-ticket', label: 'Create Ticket', page: 'create-ticket' },
      { href: '/profile', label: 'Profile', page: 'profile' },
    ],
    admin: [
      { href: '/admin', label: 'Dashboard', page: 'admin' },
      { href: '/admin/tickets', label: 'Tickets', page: 'admin-tickets' },
      { href: '/admin/assignments', label: 'Assignments', page: 'admin-assignments' },
      { href: '/admin/users', label: 'Users', page: 'admin-users' },
    ],
    manager: [
      { href: '/manager', label: 'Dashboard', page: 'manager' },
      { href: '/manager/reports', label: 'Reports', page: 'manager-reports' },
      { href: '/manager/analytics', label: 'Analytics', page: 'manager-analytics' },
    ],
  };

  const items = (menus[role] || []).map(item =>
    `<a href="${item.href}" class="${item.page === activePage ? 'active' : ''}">${item.label}</a>`
  ).join('');

  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-icon">HD</div>
        <span>HelpDesk Lite</span>
      </div>
      <nav>${items}
        <a href="#" id="logout-btn">Logout</a>
      </nav>
      <div class="user-info">
        <div>${escapeHtml(user.first_name)} ${escapeHtml(user.last_name)}</div>
        <div class="text-muted" style="color:#94a3b8">${escapeHtml(user.role)}</div>
      </div>
    </aside>
  `;
}

function initLayout(role, activePage) {
  requireRole([role]).then(user => {
    if (!user) return;
    const layout = document.querySelector('.app-layout');
    if (layout) {
      layout.insertAdjacentHTML('afterbegin', renderSidebar(role, activePage, user));
    }
    document.getElementById('logout-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
    document.dispatchEvent(new CustomEvent('layout-ready', { detail: { user } }));
  });
}

function renderFilters(containerId, meta, onFilter) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="filters-bar">
      <div class="form-group search-group">
        <label>Search</label>
        <input type="text" id="filter-search" placeholder="Ticket ID or title...">
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="filter-status"><option value="">All</option>
          ${meta.statuses.map(s => `<option value="${s}">${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Priority</label>
        <select id="filter-priority"><option value="">All</option>
          ${meta.priorities.map(p => `<option value="${p}">${p}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Category</label>
        <select id="filter-category"><option value="">All</option>
          ${meta.categories.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Assignee</label>
        <select id="filter-assignee"><option value="">All</option>
          <option value="unassigned">Unassigned</option>
        </select>
      </div>
      <div class="form-group">
        <label>From</label>
        <input type="date" id="filter-date-from">
      </div>
      <div class="form-group">
        <label>To</label>
        <input type="date" id="filter-date-to">
      </div>
      <button class="btn btn-secondary" id="filter-clear">Clear</button>
    </div>
  `;

  const getFilters = () => ({
    search: document.getElementById('filter-search').value.trim(),
    status: document.getElementById('filter-status').value,
    priority: document.getElementById('filter-priority').value,
    category: document.getElementById('filter-category').value,
    assignee: document.getElementById('filter-assignee').value,
    dateFrom: document.getElementById('filter-date-from').value,
    dateTo: document.getElementById('filter-date-to').value,
  });

  let debounce;
  container.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => onFilter(getFilters()), 300);
    });
    el.addEventListener('change', () => onFilter(getFilters()));
  });

  document.getElementById('filter-clear').addEventListener('click', () => {
    container.querySelectorAll('input, select').forEach(el => { el.value = ''; });
    onFilter(getFilters());
  });

  return container;
}

async function loadAgentsIntoFilter() {
  try {
    const { agents } = await api('/api/users/agents');
    const select = document.getElementById('filter-assignee');
    if (!select) return;
    agents.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = `${a.first_name} ${a.last_name}`;
      select.appendChild(opt);
    });
  } catch { /* employee may not have access */ }
}
