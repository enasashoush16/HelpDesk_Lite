let agents = [];

document.addEventListener('layout-ready', async () => {
  const { agents: agentList } = await api('/api/users/agents');
  agents = agentList;

  const { stats } = await api('/api/dashboard/admin');
  document.getElementById('assignment-stats').innerHTML = `
    <div class="stat-card"><div class="label">Unassigned</div><div class="value">${stats.unassigned || 0}</div></div>
    <div class="stat-card"><div class="label">Assigned</div><div class="value">${stats.assigned || 0}</div></div>
    <div class="stat-card"><div class="label">Support Agents</div><div class="value">${agents.length}</div></div>
  `;

  loadAssignments();
});

function agentOptions(selectedId) {
  return `<option value="">Select agent...</option>` +
    agents.map(a => `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${escapeHtml(a.first_name)} ${escapeHtml(a.last_name)}</option>`).join('');
}

async function loadAssignments() {
  const { tickets } = await api('/api/tickets');
  const unassigned = tickets.filter(t => !t.assigned_to);
  const assigned = tickets.filter(t => t.assigned_to);

  const unassignedBody = document.getElementById('unassigned-body');
  const empty = document.getElementById('empty-state');

  if (!unassigned.length) {
    unassignedBody.innerHTML = '';
    empty.classList.remove('hidden');
  } else {
    empty.classList.add('hidden');
    unassignedBody.innerHTML = unassigned.map(t => `
      <tr>
        <td><a class="ticket-link" href="/ticket?id=${t.id}">#${t.id}</a></td>
        <td>${escapeHtml(t.title)}</td>
        <td>${escapeHtml(t.created_by_name)}</td>
        <td>${priorityBadge(t.priority)}</td>
        <td>${statusBadge(t.status)}</td>
        <td>${formatDateShort(t.created_at)}</td>
        <td>
          <select id="assign-${t.id}" style="padding:6px;border-radius:6px;border:1px solid var(--border)">
            ${agentOptions(null)}
          </select>
          <button class="btn btn-sm btn-primary" onclick="assignTicket(${t.id})">Assign</button>
        </td>
      </tr>
    `).join('');
  }

  document.getElementById('assigned-body').innerHTML = assigned.map(t => `
    <tr>
      <td><a class="ticket-link" href="/ticket?id=${t.id}">#${t.id}</a> ${overdueBadge(t)}</td>
      <td>${escapeHtml(t.title)}</td>
      <td>${escapeHtml(t.assigned_to_name)}</td>
      <td>${priorityBadge(t.priority)}</td>
      <td>${statusBadge(t.status)}</td>
      <td>
        <select id="reassign-${t.id}" style="padding:6px;border-radius:6px;border:1px solid var(--border)">
          ${agentOptions(t.assigned_to)}
        </select>
        <button class="btn btn-sm btn-secondary" onclick="reassignTicket(${t.id})">Reassign</button>
        <button class="btn btn-sm btn-secondary" onclick="unassignTicket(${t.id})">Remove</button>
      </td>
    </tr>
  `).join('');
}

async function assignTicket(id) {
  const val = document.getElementById(`assign-${id}`).value;
  if (!val) return alert('Please select an agent');
  await api(`/api/tickets/${id}/assign`, { method: 'PUT', body: { assigned_to: val } });
  loadAssignments();
}

async function reassignTicket(id) {
  const val = document.getElementById(`reassign-${id}`).value;
  if (!val) return alert('Please select an agent');
  await api(`/api/tickets/${id}/assign`, { method: 'PUT', body: { assigned_to: val } });
  loadAssignments();
}

async function unassignTicket(id) {
  await api(`/api/tickets/${id}/assign`, { method: 'PUT', body: { assigned_to: null } });
  loadAssignments();
}

window.assignTicket = assignTicket;
window.reassignTicket = reassignTicket;
window.unassignTicket = unassignTicket;
