const params = new URLSearchParams(window.location.search);
const ticketId = params.get('id');

if (!ticketId) {
  window.location.href = '/login';
}

let currentUser = null;
let ticket = null;
let meta = null;

async function init() {
  currentUser = await getCurrentUser();
  if (!currentUser) {
    window.location.href = '/login';
    return;
  }

  const role = currentUser.role;
  const activePage = role === 'admin' ? 'admin-tickets' : role === 'manager' ? 'manager' : 'dashboard';
  document.querySelector('.app-layout').insertAdjacentHTML('afterbegin', renderSidebar(role, activePage, currentUser));
  document.getElementById('logout-btn')?.addEventListener('click', (e) => { e.preventDefault(); logout(); });

  const backLinks = { employee: '/dashboard', admin: '/admin/tickets', manager: '/manager' };
  document.getElementById('back-link').href = backLinks[role] || '/dashboard';

  meta = await api('/api/tickets/meta');
  await loadTicket();

  if (role === 'admin') {
    document.getElementById('admin-controls').classList.remove('hidden');
    setupAdminControls();
  }
}

async function loadTicket() {
  const data = await api(`/api/tickets/${ticketId}`);
  ticket = data.ticket;
  renderTicket();
}

function renderTicket() {
  document.getElementById('ticket-title').textContent = `#${ticket.id} — ${ticket.title}`;
  document.getElementById('ticket-subtitle').innerHTML =
    `${statusBadge(ticket.status)} ${priorityBadge(ticket.priority)} ${overdueBadge(ticket)}`;
  document.getElementById('ticket-description').textContent = ticket.description;
  document.getElementById('ticket-meta').innerHTML = `
    <div class="meta-item"><label>Ticket ID</label><span>#${ticket.id}</span></div>
    <div class="meta-item"><label>Category</label><span>${escapeHtml(ticket.category)}</span></div>
    <div class="meta-item"><label>Created By</label><span>${escapeHtml(ticket.created_by_name)}</span></div>
    <div class="meta-item"><label>Assigned To</label><span>${escapeHtml(ticket.assigned_to_name || 'Unassigned')}</span></div>
    <div class="meta-item"><label>Created</label><span>${formatDate(ticket.created_at)}</span></div>
    <div class="meta-item"><label>Last Updated</label><span>${formatDate(ticket.updated_at)}</span></div>
  `;
}

async function setupAdminControls() {
  const statusSelect = document.getElementById('status-select');
  meta.statuses.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    if (s === ticket.status) opt.selected = true;
    statusSelect.appendChild(opt);
  });

  const prioritySelect = document.getElementById('priority-select');
  meta.priorities.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p;
    if (p === ticket.priority) opt.selected = true;
    prioritySelect.appendChild(opt);
  });

  const { agents } = await api('/api/users/agents');
  const assignSelect = document.getElementById('assign-select');
  agents.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = `${a.first_name} ${a.last_name}`;
    if (a.id === ticket.assigned_to) opt.selected = true;
    assignSelect.appendChild(opt);
  });

  document.getElementById('save-btn').addEventListener('click', saveAdminChanges);
}

async function saveAdminChanges() {
  const msg = document.getElementById('save-msg');
  msg.classList.add('hidden');
  msg.classList.remove('form-error');
  msg.classList.add('form-success');
  try {
    await api(`/api/tickets/${ticketId}`, {
      method: 'PUT',
      body: {
        status: document.getElementById('status-select').value,
        priority: document.getElementById('priority-select').value,
      },
    });
    await api(`/api/tickets/${ticketId}/assign`, {
      method: 'PUT',
      body: { assigned_to: document.getElementById('assign-select').value || null },
    });
    await loadTicket();
    document.getElementById('status-select').value = ticket.status;
    document.getElementById('priority-select').value = ticket.priority;
    document.getElementById('assign-select').value = ticket.assigned_to || '';
    msg.textContent = 'Changes saved successfully.';
    msg.classList.remove('hidden');
  } catch (err) {
    msg.textContent = err.message;
    msg.classList.remove('hidden');
    msg.classList.remove('form-success');
    msg.classList.add('form-error');
  }
}

init();
