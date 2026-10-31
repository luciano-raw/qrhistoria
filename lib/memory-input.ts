import sharp from 'sharp';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { adaptiveCompression } from './adaptive-compression.mjs';
export const MAX_MEMORY_PHOTOS = 3;
export const MAX_MEMORY_PHOTO_BYTES = 500 * 1024;
export const MAX_MEMORY_UPLOAD_PHOTO_BYTES = 1024 * 1024;
export const TARGET_MEMORY_PHOTO_BYTES = 200 * 1024;
export const MAX_MEMORY_BODY_BYTES = 3300 * 1024;
export class SubmissionError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
const fields = z.object({ name: z.string().trim().min(2).max(80), message: z.string().trim().min(10).max(2000), website: z.string().max(0).default('') });
export async function reserveMemorySubmission(client: PrismaClient, fingerprint: string, total: number, budget: number) {
  await client.$transaction(async tx => {
    await tx.$executeRaw`INSERT INTO "SubmissionLimit" ("fingerprint") VALUES (${fingerprint}) ON CONFLICT ("fingerprint") DO NOTHING`;
    const allowed = await tx.$queryRaw<{ fingerprint: string }[]>`UPDATE "SubmissionLimit" SET "count" = CASE WHEN "windowStart" < NOW() - INTERVAL '1 hour' THEN 1 ELSE "count" + 1 END, "windowStart" = CASE WHEN "windowStart" < NOW() - INTERVAL '1 hour' THEN NOW() ELSE "windowStart" END WHERE "fingerprint" = ${fingerprint} AND ("count" < 5 OR "windowStart" < NOW() - INTERVAL '1 hour') RETURNING "fingerprint"`;
    if (!allowed.length) throw new SubmissionError('Ya recibimos varios recuerdos tuyos. Inténtalo dentro de una hora.', 429);
    if (total) {
      await tx.$executeRaw`INSERT INTO "UploadBudget" ("id") VALUES ('memories') ON CONFLICT ("id") DO NOTHING`;
      const result = await tx.uploadBudget.updateMany({ where: { id: 'memories', usedBytes: { lte: budget - total } }, data: { usedBytes: { increment: total } } });
      if (!result.count) throw new SubmissionError('El espacio para fotografías está completo. Puedes compartir tu recuerdo sin fotos.', 507);
    }
  }, { maxWait: 15000, timeout: 10000 });
}
export async function readLimitedBody(request: Request, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  if (Number(request.headers.get('content-length') || 0) > limit) throw new SubmissionError('El envío supera el tamaño permitido.', 413);
  const reader = request.body?.getReader(); if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > limit) { await reader.cancel(); throw new SubmissionError('El envío supera el tamaño permitido.', 413); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  return new Uint8Array(Buffer.concat(chunks));
}
export async function validateMemoryPhoto(file: File): Promise<Buffer> {
  if (file.size === 0 || file.size > MAX_MEMORY_UPLOAD_PHOTO_BYTES || file.type !== 'image/webp') throw new SubmissionError('No se pudo preparar esta fotografía. Vuelve a abrirla en el recortador para optimizarla automáticamente.');
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const image = sharp(bytes, { limitInputPixels: 24000000, animated: false });
    const metadata = await image.metadata();
    if (metadata.format !== 'webp' || (metadata.pages ?? 1) > 1) throw new Error('Formato incorrecto');
    if (!metadata.width || !metadata.height) throw new Error('Dimensiones inválidas');
    const rotated = (metadata.orientation ?? 1) >= 5;
    const width = rotated ? metadata.height : metadata.width;
    const height = rotated ? metadata.width : metadata.height;
    const optimized = await adaptiveCompression(async (width, height, quality) => {
      const buffer = await sharp(bytes, { limitInputPixels: 24000000 }).rotate().resize({ width, height, fit: 'inside', withoutEnlargement: true }).webp({ quality: Math.round(quality * 100), effort: 5 }).toBuffer();
      return { size: buffer.length, buffer };
    }, { width, height, maxDimension: 1920, targetBytes: TARGET_MEMORY_PHOTO_BYTES, maxBytes: MAX_MEMORY_PHOTO_BYTES });
    // Full decoding above validates the file. Keep an already-small, metadata-free
    // WebP when re-encoding would use more bytes or introduce another quality loss.
    if (Math.max(width, height) <= 1920 && bytes.length <= TARGET_MEMORY_PHOTO_BYTES && bytes.length <= optimized.size && !metadata.exif && !metadata.icc && !metadata.xmp && !metadata.orientation) return bytes;
    return optimized.buffer;
  } catch { throw new SubmissionError('Una de las fotografías no es válida. Vuelve a prepararla o elige otra imagen.'); }
}
export async function parseMemorySubmission(request: Request) {
  const body = await readLimitedBody(request, MAX_MEMORY_BODY_BYTES);
  const contentType = request.headers.get('content-type') || '';
  let raw: unknown; let files: File[] = [];
  if (contentType.startsWith('multipart/form-data')) {
    let data: FormData;
    try { data = await new Response(body, { headers: { 'content-type': contentType } }).formData(); }
    catch { throw new SubmissionError('No pudimos leer el envío. Inténtalo otra vez.'); }
    raw = { name: data.get('name'), message: data.get('message'), website: data.get('website') || '' };
    const attachments = data.getAll('photos');
    if (attachments.length > MAX_MEMORY_PHOTOS || attachments.some(file => !(file instanceof File))) throw new SubmissionError('Puedes adjuntar hasta tres fotografías.');
    files = attachments as File[];
  } else {
    try { raw = JSON.parse(new TextDecoder().decode(body)); } catch { throw new SubmissionError('El envío no es válido.'); }
  }
  const input = fields.safeParse(raw);
  if (!input.success) throw new SubmissionError('Escribe tu nombre (2–80 caracteres) y un recuerdo de 10–2000 caracteres.');
  const photos: Buffer[] = [];
  for (const file of files) photos.push(await validateMemoryPhoto(file));
  return { ...input.data, photos };
}
