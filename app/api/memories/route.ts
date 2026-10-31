import { createHmac, randomUUID } from 'node:crypto';
import { bucket, configured, db, sameOrigin, storage } from '@/lib/server';
import { parseMemorySubmission, reserveMemorySubmission, SubmissionError } from '@/lib/memory-input';
export const runtime = 'nodejs';
export const maxDuration = 30;
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Solicitud no permitida.' }, { status: 403 });
  if (!configured()) return Response.json({ error: 'Los recuerdos estarán disponibles cuando la familia termine la configuración.' }, { status: 503 });
  let reserved = 0; let saved = false; const uploaded: string[] = [];
  try {
    const input = await parseMemorySubmission(request);
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const fingerprint = createHmac('sha256', process.env.RATE_LIMIT_SECRET!).update(ip).digest('hex');
    const total = input.photos.reduce((sum, photo) => sum + photo.length, 0);
    const budget = Math.floor(Math.min(500, Math.max(1, Number(process.env.MEMORY_PHOTO_BUDGET_MB) || 150))) * 1024 * 1024;
    await reserveMemorySubmission(db(), fingerprint, total, budget);
    reserved = total;
    const photos: { path: string; bytes: number; position: number }[] = [];
    for (const [position, photo] of input.photos.entries()) {
      const path = `recuerdos/${randomUUID()}.webp`;
      const { error } = await storage().storage.from(bucket()).upload(path, photo, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
      if (error) throw new Error('No se pudo subir una fotografía');
      uploaded.push(path); photos.push({ path, bytes: photo.length, position });
    }
    const memory = await db().memory.create({ data: { name: input.name, message: input.message, fingerprint, approved: true, photos: { create: photos } }, select: { id: true, name: true, message: true, approved: true, createdAt: true, photos: { select: { path: true, bytes: true }, orderBy: { position: 'asc' } } } });
    saved = true;
    return Response.json({ memory }, { status: 201 });
  } catch (error) {
    if (!saved && reserved) {
      let clean = !uploaded.length;
      if (uploaded.length) { try { const { error: cleanupError } = await storage().storage.from(bucket()).remove(uploaded); clean = !cleanupError; } catch { clean = false; } }
      if (clean) await db().uploadBudget.updateMany({ where: { id: 'memories', usedBytes: { gte: reserved } }, data: { usedBytes: { decrement: reserved } } }).catch(() => {});
    }
    return Response.json({ error: error instanceof SubmissionError ? error.message : 'No pudimos guardar el recuerdo. Inténtalo más tarde.' }, { status: error instanceof SubmissionError ? error.status : 500 });
  }
}
