import { adaptiveCompression } from './adaptive-compression.mjs';
export type Crop = { x: number; y: number; width: number; height: number };
export async function compressImage(source: string, crop: Crop, options: { maxDimension?: number; maxBytes?: number; targetBytes?: number } = {}): Promise<Blob> {
  const image = new Image(); image.crossOrigin = 'anonymous'; image.src = source; await image.decode();
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d'); if (!context) throw new Error('Tu navegador no permite procesar esta imagen.');
  let rendered = false;
  return adaptiveCompression(async (width, height, quality) => {
    if (!rendered || canvas.width !== width || canvas.height !== height) {
      canvas.width = width; canvas.height = height;
      context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
      context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);
      rendered = true;
    }
    return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob && blob.type === 'image/webp' ? resolve(blob) : reject(new Error('Este navegador no permite guardar WebP. Prueba con Chrome o Edge.')), 'image/webp', quality));
  }, { width: crop.width, height: crop.height, ...options });
}
