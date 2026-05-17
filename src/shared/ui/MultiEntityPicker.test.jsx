import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultiEntityPicker } from './MultiEntityPicker';

const items = [
  { id: 1, nombre: 'Juan' },
  { id: 2, nombre: 'Pedro' },
  { id: 3, nombre: 'Ana' },
];

describe('MultiEntityPicker', () => {
  it('agrega un valor al elegirlo del buscador', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MultiEntityPicker values={[]} items={items} onChange={onChange} addLabel="Agregar técnico" emptyText="Sin técnicos asignados" />);

    expect(screen.getByText('Sin técnicos asignados')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /agregar técnico/i }));
    await user.click(screen.getByRole('button', { name: 'Pedro' }));

    expect(onChange).toHaveBeenCalledWith([2]);
  });

  it('muestra los seleccionados como etiquetas y permite quitarlos', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MultiEntityPicker values={[1, 3]} items={items} onChange={onChange} />);

    expect(screen.getByText('Juan')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();

    await user.click(screen.getAllByTitle('Quitar')[0]);
    expect(onChange).toHaveBeenCalledWith([3]);
  });

  it('no ofrece como opción los que ya están seleccionados', async () => {
    const user = userEvent.setup();
    render(<MultiEntityPicker values={[1]} items={items} onChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /agregar/i }));
    expect(screen.getByRole('button', { name: 'Pedro' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ana' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Juan' })).not.toBeInTheDocument();
  });
});
