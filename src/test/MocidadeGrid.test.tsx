import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MocidadeGrid from '../components/MocidadeGrid';

describe('MocidadeGrid', () => {
  const mockJovens = [
    { id: '1', nome: 'Ana', status_anel: 'disponivel' as const, avatar: 'https://example.com/ana.webp', xp: 120 },
    { id: '2', nome: 'João', status_anel: 'offline' as const, avatar: null, xp: 45 },
    { id: '3', nome: 'Maria', status_anel: 'orando' as const, avatar: null, xp: 2800 },
  ];

  const renderGrid = (jovens = mockJovens) => render(
    <MemoryRouter>
      <MocidadeGrid jovens={jovens} />
    </MemoryRouter>,
  );

  it('should render the section title', () => {
    renderGrid();
    expect(screen.getByText('A Mocidade')).toBeInTheDocument();
  });

  it('should render all jovens', () => {
    renderGrid();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('João')).toBeInTheDocument();
    expect(screen.getByText('Maria')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir perfil de Ana' })).toHaveAttribute('href', '/perfil/1');
    expect(screen.getByRole('img', { name: 'Ana' })).toHaveAttribute('src', 'https://example.com/ana.webp');
  });

  it('should render the empty state without mock entries', () => {
    renderGrid([]);
    expect(screen.getByText('A Mocidade')).toBeInTheDocument();
    expect(screen.getByText('Nenhum membro para mostrar agora.')).toBeInTheDocument();
    expect(screen.queryByText('Servo Fiel')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
