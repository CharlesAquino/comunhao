import type { LojaItem } from '../types';

export type StoreTheme = 'light' | 'dark';

export function getStoreProductImage(item: LojaItem, theme: StoreTheme): string {
  // Itens legados e edições interrompidas podem ter somente uma variante
  // temática persistida. A vitrine não deve ocultar uma imagem válida apenas
  // porque a arte específica daquele tema está ausente.
  if (theme === 'light') {
    return item.imagem_url_claro || item.imagem_url || item.imagem_url_escuro || '';
  }
  return item.imagem_url_escuro || item.imagem_url || item.imagem_url_claro || '';
}
