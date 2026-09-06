export const STORE_PRODUCTS_BUCKET = 'loja-produtos';
export const STORE_IMAGE_MAX_INPUT_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function validateStoreProductImage(file: Pick<File, 'size' | 'type'>): void {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('Use uma imagem JPEG, PNG ou WebP.');
  if (file.size > STORE_IMAGE_MAX_INPUT_BYTES) throw new Error('A imagem deve ter no máximo 8 MB.');
}

export function getStoreProductPath(url: string): string | null {
  const marker = `/storage/v1/object/public/${STORE_PRODUCTS_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index < 0) return null;
  return decodeURIComponent(url.slice(index + marker.length).split('?')[0]);
}
