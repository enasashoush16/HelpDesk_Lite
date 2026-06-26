let agents = [];
let meta = null;

document.addEventListener('layout-ready', async () => {
  meta = await api('/api/tickets/meta');
  const { agents: agentList } = await api('/api/users/agents');
  agents = agentList;

  renderFilters('filters', meta, loadTickets);
  loadAgentsIntoFilter();

  const statsEl = document.getElementById('stats-cards');
  if (statsEl) {
    const { stats } = await api('/api/dashboard/admin');
    statsEl.innerHTML = `
      <div class="stat-card"><div class="label">Total</div><div class="value">${stats.total || 0}</div></div>
      <div class="stat-card"><div class="label">Unassigned</div><div class="value">${stats.unassigned || 0}</div></div>
      <div class="stat-card"><div class="label">Assigned</div><div class="value">${stats.assigned || 0}</div></div>
      <div class="stat-card"><div class="label">In Progress</div><div class="value">${stats.in_progress || 0}</div></div>
      <div class="stat-card"><div class="label">Review</div><div class="value">${stats.review || 0}</div></div>
      <div class="stat-card"><div class="label">Completed</div><div class="value">${stats.completed || 0}</div></div>
    `;
  }

  loadTickets({});
});

async function loadTickets(filters) {
  const qs = buildQueryParams(filters);
  const { tickets } = await api(`/api/tickets${qs}`);
  const tbody = document.getElementById('tickets-body');
  const empty = document.getElementById('empty-state');

  if (!tickets.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  tbody.innerHTML = tickets.map(t => `
    <tr>
      <td><a class="ticket-link" href="/ticket?id=${t.id}">#${t.id}</a> ${overdueBadge(t)}</td>
      <td>${escapeHtml(t.title)}</td>
      <td>${escapeHtml(t.created_by_name)}</td>
      <td>${escapeHtml(t.assigned_to_name || 'Unassigned')}</td>
      <td>${priorityBadge(t.priority)}</td>
      <td>${statusBadge(t.status)}</td>
      <td>${formatDateShort(t.created_at)}</td>
      <td>
        <a class="btn btn-sm btn-secondary" href="/ticket?id=${t.id}">View</a>
        <button class="btn btn-sm btn-primary btn-status" data-id="${t.id}" data-status="${escapeHtml(t.status)}">Status</button>
        <button class="btn btn-sm btn-secondary btn-assign" data-id="${t.id}" data-assignee="${t.assigned_to || ''}">${t.assigned_to ? 'Reassign' : 'Assign'}</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.btn-status').forEach(btn => {
    btn.addEventListener('click', () => openStatusModal(btn.dataset.id, btn.dataset.status));
  });
  tbody.querySelectorAll('.btn-assign').forEach(btn => {
    btn.addEventListener('click', () => openAssignModal(btn.dataset.id, btn.dataset.assignee || null));
  });
}

function openStatusModal(id, currentStatus) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3>Update Status — Ticket #${id}</h3>
      <div class="form-group">
        <label>Status</label>
        <select id="modal-status">
          ${meta.statuses.map(s => `<option value="${s}" ${s === currentStatus ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="modal-save">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#modal-cancel').onclick = () => overlay.remove();
  overlay.querySelector('#modal-save').onclick = async () => {
    await api(`/api/tickets/${id}`, {
      method: 'PUT',
      body: { status: document.getElementById('modal-status').value },
    });
    overlay.remove();
    loadTickets(getCurrentFilters());
  };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

function openAssignModal(id, currentAssignee) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h3>Assign Ticket #${id}</h3>
      <div class="form-group">
        <label>Assign To</label>
        <select id="modal-assign">
          <option value="">Unassigned</option>
          ${agents.map(a => `<option value="${a.id}" ${a.id === currentAssignee ? 'selected' : ''}>${escapeHtml(a.first_name)} ${escapeHtml(a.last_name)}</option>`).join('')}
        </select>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="modal-save">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('#modal-cancel').onclick = () => overlay.remove();
  overlay.querySelector('#modal-save').onclick = async () => {
    await api(`/api/tickets/${id}/assign`, {
      method: 'PUT',
      body: { assigned_to: document.getElementById('modal-assign').value || null },
    });
    overlay.remove();
    loadTickets(getCurrentFilters());
  };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

function getCurrentFilters() {
  return {
    search: document.getElementById('filter-search')?.value.trim() || '',
    status: document.getElementById('filter-status')?.value || '',
    priority: document.getElementById('filter-priority')?.value || '',
    category: document.getElementById('filter-category')?.value || '',
    assignee: document.getElementById('filter-assignee')?.value || '',
    dateFrom: document.getElementById('filter-date-from')?.value || '',
    dateTo: document.getElementById('filter-date-to')?.value || '',
  };
}

window.openStatusModal = openStatusModal;
window.openAssignModal = openAssignModal;
