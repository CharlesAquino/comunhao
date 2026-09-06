import { supabase } from './supabaseClient';
import { getUserId } from './authService';
import {
  MURAL_MAX_IMAGE_BYTES,
  MURAL_MAX_IMAGE_HEIGHT,
  MURAL_MAX_IMAGE_WIDTH,
  MURAL_MEDIA_BUCKET,
  validateMuralImageFile,
} from './muralSocial';

export interface PreparedMuralImage {
  blob: Blob;
  width: number;
  height: number;
  mimeType: 'image/webp';
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Não foi possível preparar a imagem.')),
      'image/webp',
      quality,
    );
  });
}

async function decodeImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; dispose: () => void }> {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      };
    } catch {
      // Safari e alguns formatos de câmera podem exigir o caminho via HTMLImageElement.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  image.src = objectUrl;
  await image.decode();

  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    dispose: () => URL.revokeObjectURL(objectUrl),
  };
}

function fitWithin(width: number, height: number, maxWidth: number, maxHeight: number): { width: number; height: number } {
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function prepareMuralImage(file: File): Promise<PreparedMuralImage> {
  validateMuralImageFile(file);

  const decoded = await decodeImage(file);
  try {
    let dimensions = fitWithin(
      decoded.width,
      decoded.height,
      MURAL_MAX_IMAGE_WIDTH,
      MURAL_MAX_IMAGE_HEIGHT,
    );

    let quality = 0.86;
    let best: Blob | null = null;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;

      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Seu aparelho não conseguiu processar a foto.');

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(decoded.source, 0, 0, dimensions.width, dimensions.height);

      const blob = await canvasToBlob(canvas, quality);
      best = blob;

      if (blob.size <= MURAL_MAX_IMAGE_BYTES) {
        return {
          blob,
          width: dimensions.width,
          height: dimensions.height,
          mimeType: 'image/webp',
        };
      }

      if (quality > 0.56) {
        quality -= 0.08;
      } else {
        dimensions = {
          width: Math.max(1, Math.round(dimensions.width * 0.84)),
          height: Math.max(1, Math.round(dimensions.height * 0.84)),
        };
      }
    }

    throw new Error(
      best
        ? 'Não foi possível reduzir esta foto para 1,2 MB. Escolha outra imagem.'
        : 'Não foi possível preparar esta foto.',
    );
  } finally {
    decoded.dispose();
  }
}

export async function uploadMuralImage(publicationId: string, file: File): Promise<void> {
  const userId = await getUserId();
  const prepared = await prepareMuralImage(file);
  const storagePath = `${userId}/${publicationId}/feed.webp`;

  const { error: uploadError } = await supabase.storage
    .from(MURAL_MEDIA_BUCKET)
    .upload(storagePath, prepared.blob, {
      cacheControl: '3600',
      contentType: prepared.mimeType,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { error: rowError } = await supabase
    .from('mural_midias')
    .insert({
      publicacao_id: publicationId,
      autor_id: userId,
      storage_path: storagePath,
      mime_type: prepared.mimeType,
      largura: prepared.width,
      altura: prepared.height,
      tamanho_bytes: prepared.blob.size,
    });

  if (rowError) {
    await supabase.storage.from(MURAL_MEDIA_BUCKET).remove([storagePath]);
    throw rowError;
  }
}

export async function createSignedMuralImageUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(MURAL_MEDIA_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (error) return null;
  return data.signedUrl;
}
