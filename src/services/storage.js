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

  // Ordenes de trabajo
  upsertOT(item) {
    return request('/ordenes-trabajo', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },
  removeOT(id) {
    return request(`/ordenes-trabajo/${id}`, { method: 'DELETE' });
  },
  uploadAdjunto(otId, files) {
    const form = new FormData();
    for (const f of files) form.append('files', f);
    return fetch(`${BASE}/ordenes-trabajo/${otId}/adjuntos`, {
      method: 'POST',
      credentials: 'same-origin',
      body: form,
    }).then(async (res) => {
      if (res.status === 401 && onUnauthorized) onUnauthorized();
      if (!res.ok) {
        let msg = `${res.status}`;
        try { const b = await res.json(); if (b?.error) msg = b.error; } catch { /**/ }
        const err = new Error(msg); err.status = res.status; throw err;
      }
      return res.json();
    });
  },
  removeAdjunto(otId, adjId) {
    return request(`/ordenes-trabajo/${otId}/adjuntos/${adjId}`, { method: 'DELETE' });
  },

  // Plantillas checklist
  upsertPlantilla(item) {
    return request('/plantillas-checklist', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },
  removePlantilla(id) {
    return request(`/plantillas-checklist/${id}`, { method: 'DELETE' });
  },
};
