import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storage } from './storage';

function mockFetchOnce(body, { status = 200 } = {}) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  });
}

describe('storage adapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('read() llama GET /api/data y devuelve el JSON', async () => {
    const fakeData = { clientes: [{ id: 'cl-1', nombre: 'X' }], ordenes: [] };
    mockFetchOnce(fakeData);

    const result = await storage.read();

    expect(fetch).toHaveBeenCalledWith('/api/data', expect.any(Object));
    expect(result).toEqual(fakeData);
  });

  it('upsert() llama POST /api/<collection> con el item', async () => {
    const item = { id: 'cl-2', nombre: 'Nueva' };
    mockFetchOnce(item);

    await storage.upsert('clientes', item);

    expect(fetch).toHaveBeenCalledWith('/api/clientes', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(item),
    }));
  });

  it('remove() llama DELETE /api/<collection>/<id>', async () => {
    mockFetchOnce(null, { status: 204 });

    await storage.remove('clientes', 'cl-2');

    expect(fetch).toHaveBeenCalledWith('/api/clientes/cl-2', expect.objectContaining({
      method: 'DELETE',
    }));
  });

  it('lanza error con el mensaje del backend cuando la API responde 409 (en uso)', async () => {
    mockFetchOnce({ error: 'No se puede eliminar: este elemento está siendo utilizado en otros registros.' }, { status: 409 });

    await expect(storage.remove('clientes', 'cl-1')).rejects.toThrow(/utilizado en otros registros/);
  });

  it('lanza error si la API responde con status no-OK', async () => {
    mockFetchOnce('Internal error', { status: 500 });

    await expect(storage.read()).rejects.toThrow();
  });
});
