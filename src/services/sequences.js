// Cliente HTTP para los endpoints de secuencias.

async function jsonOrThrow(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
  return body;
}

export async function fetchSequences() {
  const res = await fetch('/api/sequences', { credentials: 'same-origin' });
  return jsonOrThrow(res);
}

export async function updateSequenceApi(id, payload) {
  const res = await fetch(`/api/sequences/${id}`, {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return jsonOrThrow(res);
}
