import { describe, expect, it } from 'vitest';
import { STORE_IMAGE_MAX_INPUT_BYTES, getStoreProductPath, validateStoreProductImage } from '../services/storeImageRules';

describe('imagens de produtos da loja', () => {
  it('aceita os formatos previstos', () => {
    expect(() => validateStoreProductImage({ type: 'image/jpeg', size: 1000 })).not.toThrow();
    expect(() => validateStoreProductImage({ type: 'image/png', size: 1000 })).not.toThrow();
    expect(() => validateStoreProductImage({ type: 'image/webp', size: 1000 })).not.toThrow();
  });

  it('rejeita formato ou tamanho fora da regra', () => {
    expect(() => validateStoreProductImage({ type: 'image/gif', size: 1000 })).toThrow('JPEG, PNG ou WebP');
    expect(() => validateStoreProductImage({ type: 'image/webp', size: STORE_IMAGE_MAX_INPUT_BYTES + 1 })).toThrow('8 MB');
  });

  it('extrai apenas caminhos pertencentes ao bucket da loja', () => {
    const url = 'https://example.supabase.co/storage/v1/object/public/loja-produtos/user/foto.webp';
    expect(getStoreProductPath(url)).toBe('user/foto.webp');
    expect(getStoreProductPath('/store-products/biblia.webp')).toBeNull();
  });
});
