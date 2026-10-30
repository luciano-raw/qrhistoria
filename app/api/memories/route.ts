import { createHmac } from 'node:crypto';
import { z } from 'zod';
import { configured, db, sameOrigin } from '@/lib/server';
const schema = z.object({ name: z.string().trim().min(2).max(80), message: z.string().trim().min(10).max(2000), website: z.string().max(0) });
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: 'Solicitud no permitida.' }, { status: 403 });
  if (!configured()) return Response.json({ error: 'Los recuerdos estarán disponibles cuando la familia termine la configuración.' }, { status: 503 });
  if (Number(request.headers.get('content-length') || 0) > 12000) return Response.json({ error: 'Mensaje demasiado largo.' }, { status: 413 });
  try {
    const raw = await request.text();
    if (raw.length > 12000) return Response.json({ error: 'Mensaje demasiado largo.' }, { status: 413 });
    const input = schema.safeParse(JSON.parse(raw));
    if (!input.success) return Response.json({ error: 'Escribe tu nombre (2–80 caracteres) y un recuerdo de 10–2000 caracteres.' }, { status: 400 });
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const fingerprint = createHmac('sha256', process.env.RATE_LIMIT_SECRET!).update(ip).digest('hex');
    const count = await db().memory.count({ where: { fingerprint, createdAt: { gte: new Date(Date.now() - 3600000) } } });
    if (count >= 5) return Response.json({ error: 'Ya recibimos varios recuerdos tuyos. Inténtalo dentro de una hora.' }, { status: 429 });
    await db().memory.create({ data: { name: input.data.name, message: input.data.message, fingerprint } });
    return Response.json({ ok: true }, { status: 201 });
  } catch { return Response.json({ error: 'No pudimos guardar el recuerdo. Inténtalo más tarde.' }, { status: 500 }); }
}
