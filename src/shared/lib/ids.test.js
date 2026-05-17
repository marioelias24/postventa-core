import { describe, it, expect } from 'vitest';
import { newId } from './ids';

describe('newId', () => {
  it('usa el prefix indicado', () => {
    expect(newId('os')).toMatch(/^os-/);
  });

  it('usa "id" como prefix por defecto', () => {
    expect(newId()).toMatch(/^id-/);
  });

  it('genera ids distintos en llamadas consecutivas', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newId('x')));
    expect(ids.size).toBe(50);
  });
});
