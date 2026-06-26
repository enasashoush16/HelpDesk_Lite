document.addEventListener('layout-ready', async () => {
  const meta = await api('/api/tickets/meta');
  renderFilters('filters', meta, loadTickets);

  try {
    const { stats } = await api('/api/dashboard/employee');
    const cards = document.getElementById('stats-cards');
    if (cards) {
      cards.innerHTML = `
        <div class="stat-card"><div class="label">Total Tickets</div><div class="value">${stats.total || 0}</div></div>
        <div class="stat-card"><div class="label">Open Tickets</div><div class="value">${stats.open || 0}</div></div>
        <div class="stat-card"><div class="label">In Progress</div><div class="value">${stats.in_progress || 0}</div></div>
        <div class="stat-card"><div class="label">Completed</div><div class="value">${stats.completed || 0}</div></div>
      `;
    }
  } catch { /* my-tickets page has no stats */ }

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
      <td><a class="ticket-link" href="/ticket?id=${t.id}">${escapeHtml(t.title)}</a></td>
      <td>${escapeHtml(t.category)}</td>
      <td>${priorityBadge(t.priority)}</td>
      <td>${statusBadge(t.status)}</td>
      <td>${escapeHtml(t.assigned_to_name || 'Unassigned')}</td>
      <td>${formatDateShort(t.created_at)}</td>
    </tr>
  `).join('');
}
