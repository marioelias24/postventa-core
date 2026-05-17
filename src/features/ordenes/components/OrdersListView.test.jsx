import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrdersListView } from './OrdersListView';

const mockData = {
  ordenes: [
    { id: 1, numero: 'OS-2026-0001', clienteId: 1, tecnicoId: 1, tipoId: 1, estadoId: 1, fechaProgramada: '2026-05-08', horaInicio: '08:00', equipo: 'Puerta principal' },
    { id: 2, numero: 'OS-2026-0002', clienteId: 1, tecnicoId: 2, tipoId: 2, estadoId: 2, fechaProgramada: '2026-05-09', horaInicio: '09:00', equipo: 'Sensor lateral' },
  ],
  clientes: [{ id: 1, nombre: 'CC Multiplaza' }],
  tecnicos: [{ id: 1, nombre: 'Juan' }, { id: 2, nombre: 'Pedro' }],
  tipos: [{ id: 1, nombre: 'Preventivo', color: '#0ea5e9' }, { id: 2, nombre: 'Correctivo', color: '#f59e0b' }],
  estados: [{ id: 1, nombre: 'Pendiente', color: '#64748b' }, { id: 2, nombre: 'Completada', color: '#10b981' }],
};

const noop = vi.fn();

describe('OrdersListView', () => {
  it('renderiza todas las órdenes y muestra el contador', () => {
    render(<OrdersListView data={mockData} onEdit={noop} onDelete={noop} onAdd={noop} />);
    expect(screen.getByText('OS-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('OS-2026-0002')).toBeInTheDocument();
    expect(screen.getByText(/Mostrando 1.2 de 2 .rdenes/, { selector: 'span' })).toBeInTheDocument();
  });

  it('filtra por búsqueda en cliente/numero/equipo', async () => {
    const user = userEvent.setup();
    render(<OrdersListView data={mockData} onEdit={noop} onDelete={noop} onAdd={noop} />);

    await user.type(screen.getByPlaceholderText(/buscar/i), 'lateral');

    expect(screen.getByText('OS-2026-0002')).toBeInTheDocument();
    expect(screen.queryByText('OS-2026-0001')).not.toBeInTheDocument();
    expect(screen.getByText(/Mostrando 1.1 de 1 orden/, { selector: 'span' })).toBeInTheDocument();
  });

  it('llama onAdd cuando se hace clic en el botón Nueva', async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<OrdersListView data={mockData} onEdit={noop} onDelete={noop} onAdd={onAdd} />);

    await user.click(screen.getByRole('button', { name: /nueva/i }));

    expect(onAdd).toHaveBeenCalledOnce();
  });

  it('abre la orden al hacer clic en cualquier parte de la fila, con los ids hermanos', async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<OrdersListView data={mockData} onEdit={onEdit} onDelete={noop} onAdd={noop} />);

    await user.click(screen.getByText('Sensor lateral'));

    expect(onEdit).toHaveBeenCalledTimes(1);
    const [orden, siblingIds] = onEdit.mock.calls[0];
    expect(orden.id).toBe(2);
    // La lista (ordenada por fecha desc) son los hermanos para los botones ‹ ›.
    expect(siblingIds).toEqual([2, 1]);
  });
});
