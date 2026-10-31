export type Crop = { x: number; y: number; width: number; height: number };
export async function compressImage(source: string, crop: Crop, options: { maxDimension?: number; maxBytes?: number; targetBytes?: number } = {}): Promise<Blob> {
  const image = new Image(); image.crossOrigin = 'anonymous'; image.src = source; await image.decode();
  const ratio = Math.min(1, (options.maxDimension ?? 1600) / Math.max(crop.width, crop.height));
  const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(crop.width * ratio)); canvas.height = Math.max(1, Math.round(crop.height * ratio));
  const context = canvas.getContext('2d'); if (!context) throw new Error('Tu navegador no permite procesar esta imagen.');
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
  const encode = (quality: number) => new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob && blob.type === 'image/webp' ? resolve(blob) : reject(new Error('Este navegador no permite guardar WebP. Prueba con Chrome o Edge.')), 'image/webp', quality));
  let blob = await encode(.8);
  if (blob.size > (options.targetBytes ?? 650 * 1024)) blob = await encode(.65);
  if (blob.size > (options.maxBytes ?? 2 * 1024 * 1024)) blob = await encode(.45);
  if (blob.size > (options.maxBytes ?? 2 * 1024 * 1024)) throw new Error('La foto sigue siendo demasiado grande. Prueba un recorte más pequeño.');
  return blob;
}
