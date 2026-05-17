import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock global del módulo de permisos: los tests existentes se escribieron
// antes del RBAC y asumen "todo permitido" (= rol admin). Los tests
// específicos pueden override con vi.mock() local si quieren probar casos
// de usuarios restringidos.
vi.mock('@/app/permissions', async () => {
  const actual = await vi.importActual('@/app/permissions');
  return {
    ...actual,
    useCan: () => true,
    useRole: () => 'admin',
    hasPermission: () => true,
    Can: ({ children }) => children,
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  localStorage.clear();
});
