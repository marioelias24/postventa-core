import { describe, it, expect } from 'vitest';
import { fmt } from './dates';

describe('fmt', () => {
  it('formatea un Date en YYYY-MM-DD', () => {
    expect(fmt(new Date(2026, 4, 8))).toBe('2026-05-08');
  });

  it('rellena con ceros mes y día de un solo dígito', () => {
    expect(fmt(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('acepta un string parseable por Date', () => {
    expect(fmt('2026-12-25T10:00:00')).toBe('2026-12-25');
  });
});
