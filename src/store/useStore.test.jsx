import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useStore } from './useStore';

// Servidor mockeado: asigna IDs autoincrement (como Postgres).
function mockFetch(initialData) {
  const state = JSON.parse(JSON.stringify(initialData));
  const nextId = {};
  Object.entries(state).forEach(([k, arr]) => {
    nextId[k] = arr.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1;
  });

  const handler = (url, options = {}) => {
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : null;

    if (url === '/api/data' && method === 'GET') return jsonResponse(state);

    const m = url.match(/^\/api\/([a-z]+)(?:\/([^/]+))?$/);
    if (m) {
      const [, collection, idStr] = m;
      if (method === 'POST') {
        if (Number.isInteger(body.id) && body.id > 0) {
          // UPDATE
          const arr = state[collection] || [];
          const idx = arr.findIndex(x => x.id === body.id);
          if (idx >= 0) arr[idx] = { ...arr[idx], ...body };
          return jsonResponse(arr[idx]);
        }
        // CREATE
        const created = { ...body, id: nextId[collection]++ };
        (state[collection] = state[collection] || []).push(created);
        return jsonResponse(created);
      }
      if (method === 'DELETE') {
        const id = Number(idStr);
        state[collection] = (state[collection] || []).filter(x => x.id !== id);
        return new Response(null, { status: 204 });
      }
    }
    return new Response('Not found', { status: 404 });
  };

  vi.spyOn(globalThis, 'fetch').mockImplementation(handler);
  return state;
}

function jsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

const baseData = {
  clientes: [
    { id: 1, nombre: 'CC Multiplaza' },
    { id: 2, nombre: 'Banco Nacional' },
  ],
  tecnicos: [], tipos: [], estados: [], prioridades: [], ordenes: [],
};

async function mountStore() {
  const view = renderHook(() => useStore());
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
}

describe('useStore (contra API mockeada con IDs numéricos)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('lee los datos iniciales del backend', async () => {
    mockFetch(baseData);
    const { result } = await mountStore();
    expect(result.current.data.clientes).toHaveLength(2);
    expect(result.current.data.clientes[0].id).toBe(1);
  });

  it('upsert sin id pide al servidor el id (CREATE)', async () => {
    mockFetch(baseData);
    const { result } = await mountStore();

    await act(async () => {
      await result.current.upsert('clientes', { nombre: 'Nuevo' });
    });

    await waitFor(() => {
      expect(result.current.data.clientes).toHaveLength(3);
    });
    expect(result.current.data.clientes.at(-1).nombre).toBe('Nuevo');
    expect(result.current.data.clientes.at(-1).id).toBe(3);
  });

  it('upsert con id existente actualiza (UPDATE optimistic)', async () => {
    mockFetch(baseData);
    const { result } = await mountStore();

    act(() => {
      result.current.upsert('clientes', { id: 1, nombre: 'Cambiado' });
    });

    expect(result.current.data.clientes).toHaveLength(2);
    expect(result.current.data.clientes.find(c => c.id === 1).nombre).toBe('Cambiado');
  });

  it('remove elimina por id (optimistic)', async () => {
    mockFetch(baseData);
    const { result } = await mountStore();

    act(() => { result.current.remove('clientes', 1); });

    expect(result.current.data.clientes).toHaveLength(1);
    expect(result.current.data.clientes.find(c => c.id === 1)).toBeUndefined();
  });
});
