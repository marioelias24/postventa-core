// Cliente HTTP para los endpoints de empresa.

async function jsonOrThrow(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
  return body;
}

export async function fetchEmpresa() {
  const res = await fetch('/api/empresa', { credentials: 'same-origin' });
  return jsonOrThrow(res);
}

export async function updateEmpresaApi(payload) {
  const res = await fetch('/api/empresa', {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return jsonOrThrow(res);
}

export async function uploadEmpresaLogoApi(file) {
  const fd = new FormData();
  fd.append('logo', file);
  const res = await fetch('/api/empresa/logo', {
    method: 'POST',
    credentials: 'same-origin',
    body: fd,
  });
  return jsonOrThrow(res);
}

export async function deleteEmpresaLogoApi() {
  const res = await fetch('/api/empresa/logo', {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  return jsonOrThrow(res);
}

// Devuelve la URL pública del logo (servida desde nginx /uploads/), o null.
export function logoUrl(empresa) {
  if (!empresa?.logoFile) return null;
  return `/uploads/${empresa.logoFile}`;
}
