const { getDb, updateOverdueTickets } = require('../database/init');

function refreshOverdue(db) {
  updateOverdueTickets(db);
}

module.exports = { refreshOverdue };
