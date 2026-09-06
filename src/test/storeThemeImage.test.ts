import { describe, expect, it } from 'vitest';
import { getStoreProductImage } from '../services/storeThemeImage';
import type { LojaItem } from '../types';

const itemBase: LojaItem = {
  id: 'produto-1',
  nome: 'Produto',
  descricao: 'Descrição do produto',
  preco_kesef: 10,
  estoque: 1,
  categoria: 'destaque',
  ativo: true,
  imagem_url: 'legada.webp',
  imagem_url_claro: 'clara.webp',
  imagem_url_escuro: 'escura.webp',
};

describe('getStoreProductImage', () => {
  it('exibe cada imagem somente em seu respectivo tema', () => {
    expect(getStoreProductImage(itemBase, 'light')).toBe('clara.webp');
    expect(getStoreProductImage(itemBase, 'dark')).toBe('escura.webp');
  });

  it('usa uma imagem válida de contingência quando uma variante está ausente', () => {
    expect(getStoreProductImage({ ...itemBase, imagem_url_claro: null }, 'light')).toBe('legada.webp');
    expect(getStoreProductImage({ ...itemBase, imagem_url_escuro: null }, 'dark')).toBe('legada.webp');
  });

  it('mantém o campo antigo apenas para produtos sem imagens temáticas', () => {
    const legado = { ...itemBase, imagem_url_claro: null, imagem_url_escuro: null };
    expect(getStoreProductImage(legado, 'light')).toBe('legada.webp');
    expect(getStoreProductImage(legado, 'dark')).toBe('legada.webp');
  });
});
