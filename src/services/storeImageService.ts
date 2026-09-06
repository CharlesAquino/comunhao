import { supabase } from './supabaseClient';
import { createRuntimeId } from '../utils/createRuntimeId';
import { STORE_PRODUCTS_BUCKET, validateStoreProductImage } from './storeImageRules';
export { getStoreProductPath, validateStoreProductImage } from './storeImageRules';

const STORE_IMAGE_MAX_OUTPUT_BYTES = 1_500_000;
const STORE_IMAGE_MAX_DIMENSION = 1600;

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error('Não foi possível preparar a imagem.')),
    'image/webp',
    quality,
  ));
}

async function prepareImage(file: File): Promise<Blob> {
  validateStoreProductImage(file);
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  image.src = objectUrl;

  try {
    await image.decode();
    const scale = Math.min(1, STORE_IMAGE_MAX_DIMENSION / image.naturalWidth, STORE_IMAGE_MAX_DIMENSION / image.naturalHeight);
    let width = Math.max(1, Math.round(image.naturalWidth * scale));
    let height = Math.max(1, Math.round(image.naturalHeight * scale));
    let quality = 0.88;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Este aparelho não conseguiu processar a imagem.');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, width, height);
      const blob = await canvasToBlob(canvas, quality);
      if (blob.size <= STORE_IMAGE_MAX_OUTPUT_BYTES) return blob;
      if (quality > 0.58) quality -= 0.08;
      else {
        width = Math.max(1, Math.round(width * 0.84));
        height = Math.max(1, Math.round(height * 0.84));
      }
    }
    throw new Error('Não foi possível otimizar esta imagem. Escolha outra foto.');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export interface UploadedStoreImage { url: string; path: string }

export async function uploadStoreProductImage(file: File, variant?: 'claro' | 'escuro'): Promise<UploadedStoreImage> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('USER_NOT_AUTHENTICATED');
  const blob = await prepareImage(file);
  const suffix = variant ? `-${variant}` : '';
  const path = `${user.id}/${createRuntimeId()}${suffix}.webp`;
  const { error } = await supabase.storage.from(STORE_PRODUCTS_BUCKET).upload(path, blob, {
    cacheControl: '31536000', contentType: 'image/webp', upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(STORE_PRODUCTS_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function removeStoreProductImage(path: string): Promise<void> {
  const { error } = await supabase.storage.from(STORE_PRODUCTS_BUCKET).remove([path]);
  if (error) throw error;
}
