// Cliente HTTP para los endpoints de usuarios.

async function jsonOrThrow(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
  return body;
}

export async function fetchUsers() {
  const res = await fetch('/api/users', { credentials: 'same-origin' });
  return jsonOrThrow(res);
}

export async function createUserApi(email, password, role) {
  const res = await fetch('/api/users', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role }),
  });
  return jsonOrThrow(res);
}

export async function deleteUserApi(id) {
  const res = await fetch(`/api/users/${id}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  if (res.status === 204) return { ok: true };
  return jsonOrThrow(res);
}

export async function resetUserPasswordApi(id, newPassword) {
  const res = await fetch(`/api/users/${id}/reset-password`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newPassword }),
  });
  return jsonOrThrow(res);
}

export async function updateUserRoleApi(id, role) {
  const res = await fetch(`/api/users/${id}/role`, {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  return jsonOrThrow(res);
}

export async function changeMyPassword(currentPassword, newPassword) {
  const res = await fetch('/api/auth/change-password', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return jsonOrThrow(res);
}
