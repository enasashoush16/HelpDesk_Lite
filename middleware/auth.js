function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.session.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

function attachUser(req, res, next) {
  if (req.session.userId) {
    req.user = {
      id: req.session.userId,
      role: req.session.role,
      email: req.session.email,
      firstName: req.session.firstName,
      lastName: req.session.lastName,
    };
  }
  next();
}

module.exports = { requireAuth, requireRole, attachUser };
