import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import KesefCoin3D from '../components/kesef/KesefCoin3D';

describe('KesefCoin3D', () => {
  it('mantém uma imagem acessível como fallback enquanto o WebGL inicializa', () => {
    render(<KesefCoin3D label="Kesef de teste" className="size-48" />);

    const coin = screen.getByRole('img', { name: 'Kesef de teste' });
    expect(coin).toHaveAttribute('data-kesef-3d', 'loading');
    expect(coin.querySelector('img')).toHaveAttribute('src', '/kesef-coin.png');
  });
});
