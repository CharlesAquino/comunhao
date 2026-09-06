import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BadgeRank from '../components/BadgeRank';

describe('BadgeRank', () => {
  const ranks = [
    ['servo-fiel', 'Servo Fiel'],
    ['guardiao', 'Guardião'],
    ['intercessor', 'Intercessor'],
    ['atalaia', 'Atalaia'],
    ['discipulador', 'Discipulador'],
    ['missionario', 'Missionário'],
    ['conselheiro', 'Conselheiro'],
    ['pacificador', 'Pacificador'],
  ] as const;

  it.each(ranks)('renderiza a patente %s', (rank, label) => {
    render(<BadgeRank rank={rank} />);
    expect(screen.getByRole('img', { name: `Insígnia ${label}` })).toBeInTheDocument();
  });

  it.each([
    ['compact', 24],
    ['standard', 32],
    ['featured', 48],
  ] as const)('renderiza Servo Fiel no tamanho %s', (size, pixels) => {
    render(<BadgeRank rank="servo-fiel" size={size} />);
    const badge = screen.getByRole('img', { name: 'Insígnia Servo Fiel' });
    expect(badge).toHaveAttribute('width', String(pixels));
    expect(badge).toHaveAttribute('height', String(pixels));
  });

  it('aceita tamanho numérico e movimento opcional', () => {
    render(<BadgeRank rank="servo-fiel" size={40} animated />);
    const badge = screen.getByRole('img', { name: 'Insígnia Servo Fiel' });
    expect(badge).toHaveAttribute('width', '40');
    expect(badge).toHaveClass('badge-rank--animated');
  });
});
