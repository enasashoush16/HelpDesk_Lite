document.addEventListener('layout-ready', async () => {
  const data = await api('/api/dashboard/manager');
  renderKPIs(data.stats);
  renderCharts(data);
  renderWorkload(data.workload);

  if (typeof setupTicketTable === 'function') {
    setupTicketTable();
  }
});

function renderKPIs(stats) {
  const el = document.getElementById('kpi-cards');
  if (!el) return;
  el.innerHTML = `
    <div class="stat-card"><div class="label">Total Tickets</div><div class="value">${stats.total || 0}</div></div>
    <div class="stat-card"><div class="label">Intake</div><div class="value">${stats.intake || 0}</div></div>
    <div class="stat-card"><div class="label">Assigned</div><div class="value">${stats.assigned || 0}</div></div>
    <div class="stat-card"><div class="label">In Progress</div><div class="value">${stats.in_progress || 0}</div></div>
    <div class="stat-card"><div class="label">Review</div><div class="value">${stats.review || 0}</div></div>
    <div class="stat-card"><div class="label">Done</div><div class="value">${stats.done || 0}</div></div>
    <div class="stat-card overdue"><div class="label">Overdue</div><div class="value">${stats.overdue || 0}</div></div>
    <div class="stat-card"><div class="label">Unassigned</div><div class="value">${stats.unassigned || 0}</div></div>
  `;
}

function renderCharts(data) {
  const statusCanvas = document.getElementById('chart-status');
  if (statusCanvas && data.byStatus.length) {
    drawBarChart(
      statusCanvas,
      data.byStatus.map(s => s.status),
      data.byStatus.map(s => s.count),
      { colors: statusColors(data.byStatus.map(s => s.status)) }
    );
  }

  const categoryCanvas = document.getElementById('chart-category');
  if (categoryCanvas && data.byCategory.length) {
    drawPieChart(
      categoryCanvas,
      data.byCategory.map(c => c.category),
      data.byCategory.map(c => c.count)
    );
  }

  const assigneeCanvas = document.getElementById('chart-assignee');
  if (assigneeCanvas && data.byAssignee.length) {
    drawBarChart(
      assigneeCanvas,
      data.byAssignee.map(a => a.name),
      data.byAssignee.map(a => a.count)
    );
  }

  const priorityCanvas = document.getElementById('chart-priority');
  if (priorityCanvas) {
    loadPriorityChart();
  }
}

async function loadPriorityChart() {
  const { tickets } = await api('/api/tickets');
  const counts = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  tickets.forEach(t => { if (counts[t.priority] !== undefined) counts[t.priority]++; });
  const canvas = document.getElementById('chart-priority');
  if (canvas) {
    drawBarChart(canvas, Object.keys(counts), Object.values(counts), {
      colors: ['#16a34a', '#2563eb', '#ea580c', '#dc2626'],
    });
  }
}

function renderWorkload(workload) {
  const tbody = document.getElementById('workload-body');
  if (!tbody) return;
  if (!workload.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-muted text-center">No agents found</td></tr>';
    return;
  }
  tbody.innerHTML = workload.map(w => `
    <tr>
      <td>${escapeHtml(w.name)}</td>
      <td>${w.assigned_count || 0}</td>
      <td>${w.in_progress_count || 0}</td>
      <td>${w.completed_count || 0}</td>
    </tr>
  `).join('');
}

async function setupTicketTable() {
  const meta = await api('/api/tickets/meta');
  renderFilters('filters', meta, loadManagerTickets);
  loadAgentsIntoFilter();
  loadManagerTickets({});
}

async function loadManagerTickets(filters) {
  const qs = buildQueryParams(filters);
  const { tickets } = await api(`/api/tickets${qs}`);
  const tbody = document.getElementById('tickets-body');
  if (!tbody) return;
  tbody.innerHTML = tickets.map(t => `
    <tr>
      <td><a class="ticket-link" href="/ticket?id=${t.id}">#${t.id}</a> ${overdueBadge(t)}</td>
      <td>${escapeHtml(t.title)}</td>
      <td>${escapeHtml(t.category)}</td>
      <td>${priorityBadge(t.priority)}</td>
      <td>${statusBadge(t.status)}</td>
      <td>${escapeHtml(t.assigned_to_name || 'Unassigned')}</td>
      <td>${formatDateShort(t.created_at)}</td>
    </tr>
  `).join('');
}

window.setupTicketTable = setupTicketTable;

window.addEventListener('resize', () => {
  document.dispatchEvent(new CustomEvent('layout-ready'));
});
