// Adapter de persistencia. Habla con la API REST en /api/*.
// Toda la app usa este módulo: cambiar la fuente de datos solo requiere editar este archivo.

const BASE = '/api';

// Hook que AuthContext registra para reaccionar a 401 (sesión expirada / inexistente).
let onUnauthorized = null;
export function setOnUnauthorized(handler) {
  onUnauthorized = handler;
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    if (onUnauthorized) onUnauthorized();
    const err = new Error('Not authenticated');
    err.status = 401;
    throw err;
  }

  if (!res.ok) {
    // Intenta leer el cuerpo como JSON (la API devuelve { error }) o como texto.
    let message = `${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      const txt = await res.text().catch(() => '');
      if (txt) message = txt;
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const storage = {
  read() {
    return request('/data');
  },
  upsert(collection, item) {
    return request(`/${collection}`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },
  remove(collection, id) {
    return request(`/${collection}/${id}`, { method: 'DELETE' });
  },
  reset() {
    return request('/reset', { method: 'POST' });
  },
};
