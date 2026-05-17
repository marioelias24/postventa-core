const BASE = '/api/auth';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'same-origin',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `Auth ${path} → ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const authApi = {
  me() {
    return request('/me');
  },
  login(email, password) {
    return request('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  },
  logout() {
    return request('/logout', { method: 'POST' });
  },
};
