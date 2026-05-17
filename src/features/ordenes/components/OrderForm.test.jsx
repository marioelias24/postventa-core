import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderForm } from './OrderForm';

const mockData = {
  clientes: [{ id: 1, nombre: 'CC Multiplaza' }],
  tecnicos: [{ id: 1, nombre: 'Juan', activo: true }],
  tipos: [{ id: 1, nombre: 'Preventivo', color: '#0ea5e9', activo: true }],
  estados: [{ id: 1, nombre: 'Pendiente', color: '#64748b', orden: 1, activo: true, esFinal: false }],
  prioridades: [{ id: 1, nombre: 'Media', color: '#3b82f6', nivel: 2 }],
};

describe('OrderForm', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('rechaza guardar si falta el equipo', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<OrderForm order={null} defaultDate={new Date(2026, 4, 8)} data={mockData} onSave={onSave} onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Crear' }));

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('equipo'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('guarda con los campos mínimos: sin id, sin numero y sin valores por defecto', async () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<OrderForm order={null} defaultDate={new Date(2026, 4, 8)} data={mockData} onSave={onSave} onClose={onClose} />);

    await user.type(screen.getByPlaceholderText(/equipo \/ activo/i), 'Puerta lobby');
    await user.click(screen.getByRole('button', { name: 'Crear' }));

    const callArgs = onSave.mock.calls[0];
    expect(callArgs[0]).toBe('ordenes');
    expect(callArgs[1]).toMatchObject({
      equipo: 'Puerta lobby',
      fechaProgramada: '2026-05-08',
    });
    // Sin valores por defecto en los campos de selección.
    expect(callArgs[1].clienteId).toBeNull();
    expect(callArgs[1].tecnicoIds).toEqual([]);
    expect(callArgs[1].tipoId).toBeNull();
    expect(callArgs[1].estadoId).toBeNull();
    expect(callArgs[1].prioridadId).toBeNull();
    // El número de orden no se autogenera (viene de SAP); vacío al crear.
    expect(callArgs[1].id).toBeUndefined();
    expect(callArgs[1].numero).toBe('');
    expect(onClose).toHaveBeenCalledOnce();
  });
});
