async function api(url, options = {}) {
  const config = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'same-origin',
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const res = await fetch(url, config);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

async function getCurrentUser() {
  try {
    const data = await api('/api/auth/me');
    return data.user;
  } catch {
    return null;
  }
}

async function requireRole(roles, redirectTo = '/login') {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = redirectTo;
    return null;
  }
  if (roles && !roles.includes(user.role)) {
    const redirects = { employee: '/dashboard', admin: '/admin', manager: '/manager' };
    window.location.href = redirects[user.role] || '/login';
    return null;
  }
  return user;
}

async function logout() {
  await api('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login';
}
