import { supabase } from './supabaseClient';
import { createRuntimeId } from '../utils/createRuntimeId';
import { validateStoreProductImage } from './storeImageRules';

const BUCKET = 'cantina-produtos';
const MAX_OUTPUT = 1_500_000;
const MAX_DIMENSION = 1600;

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error('Não foi possível preparar a imagem.')),
    'image/webp', quality,
  ));
}

async function prepare(file: File): Promise<Blob> {
  validateStoreProductImage(file);
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
    const scale = Math.min(1, MAX_DIMENSION / image.naturalWidth, MAX_DIMENSION / image.naturalHeight);
    let width = Math.max(1, Math.round(image.naturalWidth * scale));
    let height = Math.max(1, Math.round(image.naturalHeight * scale));
    let quality = 0.88;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Este aparelho não conseguiu processar a imagem.');
      context.drawImage(image, 0, 0, width, height);
      const blob = await canvasBlob(canvas, quality);
      if (blob.size <= MAX_OUTPUT) return blob;
      if (quality > 0.58) quality -= 0.08;
      else { width = Math.round(width * 0.84); height = Math.round(height * 0.84); }
    }
    throw new Error('Não foi possível otimizar esta imagem.');
  } finally { URL.revokeObjectURL(url); }
}

export async function uploadCantinaProductImage(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado.');
  const path = `${user.id}/${createRuntimeId()}.webp`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, await prepare(file), {
    contentType: 'image/webp', cacheControl: '31536000', upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
