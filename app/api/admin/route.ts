import { z } from 'zod';
import { bucket, db, isAdmin, sameOrigin, storage } from '@/lib/server';
const profileSchema = z.object({ name: z.string().trim().min(1).max(120), subtitle: z.string().max(300), introduction: z.string().max(6000), quote: z.string().max(600), heroPath: z.string().nullable() });
export async function GET(request: Request) {
  if (!await isAdmin(request)) return Response.json({ error: 'Acceso no autorizado.' }, { status: 401 });
  try {
    const [profile, media, memories] = await Promise.all([db().profile.findUnique({ where: { id: 'main' } }), db().media.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] }), db().memory.findMany({ orderBy: { createdAt: 'desc' }, take: 500, select: { id: true, name: true, message: true, approved: true, createdAt: true } })]);
    return Response.json({ profile, media, memories });
  } catch { return Response.json({ error: 'No pudimos cargar el panel. Revisa la conexión de la base de datos.' }, { status: 500 }); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request) || !await isAdmin(request)) return Response.json({ error: 'Acceso no autorizado.' }, { status: 401 });
  try {
    if (Number(request.headers.get('content-length') || 0) > 16000) return Response.json({ error: 'Solicitud demasiado grande.' }, { status: 413 });
    const raw = await request.text();
    if (raw.length > 16000) return Response.json({ error: 'Solicitud demasiado grande.' }, { status: 413 });
    const data = JSON.parse(raw);
    if (data.action === 'profile') {
      const value = profileSchema.parse(data.value);
      if (value.heroPath && !await db().media.findFirst({ where: { path: value.heroPath, kind: 'image', published: true } })) throw new Error('Selecciona una foto publicada para la portada.');
      await db().profile.upsert({ where: { id: 'main' }, create: { id: 'main', ...value }, update: value });
    } else if (data.action === 'memory') {
      const value = z.object({ id: z.string(), approved: z.boolean() }).parse(data.value);
      await db().memory.update({ where: { id: value.id }, data: { approved: value.approved } });
    } else if (data.action === 'deleteMemory') {
      await db().memory.delete({ where: { id: z.string().parse(data.id) } });
    } else if (data.action === 'upload') {
      const value = z.object({ kind: z.enum(['image', 'video']), bytes: z.number().int().positive().max(25 * 1024 * 1024) }).parse(data.value);
      if (value.kind === 'image' && value.bytes > 2 * 1024 * 1024) throw new Error('La imagen debe pesar menos de 2 MB.');
      const path = `${crypto.randomUUID()}.${value.kind === 'image' ? 'webp' : 'mp4'}`;
      const { data: signed, error } = await storage().storage.from(bucket()).createSignedUploadUrl(path);
      if (error) throw error;
      return Response.json({ path, token: signed.token });
    } else if (data.action === 'createMedia') {
      const value = z.object({ title: z.string().trim().min(1).max(150), caption: z.string().max(2000), year: z.string().max(40), kind: z.enum(['image', 'video']), path: z.string().regex(/^[a-f0-9-]{36}\.(webp|mp4)$/) }).parse(data.value);
      if (!value.path.endsWith(value.kind === 'image' ? '.webp' : '.mp4')) throw new Error('Formato incorrecto.');
      const { data: info, error } = await storage().storage.from(bucket()).info(value.path);
      if (error || !info) throw new Error('No encontramos el archivo subido.');
      const bytes = Number(info.size);
      if (!Number.isFinite(bytes) || bytes <= 0 || bytes > (value.kind === 'image' ? 2 : 25) * 1024 * 1024) throw new Error('El archivo excede el límite.');
      const last = await db().media.aggregate({ _max: { position: true } });
      await db().media.create({ data: { ...value, bytes, position: (last._max.position ?? -1) + 1 } });
    } else if (data.action === 'updateMedia') {
      const value = z.object({ id: z.string(), title: z.string().trim().min(1).max(150), caption: z.string().max(2000), year: z.string().max(40), published: z.boolean() }).parse(data.value);
      const { id, ...fields } = value;
      await db().media.update({ where: { id }, data: fields });
      if (!value.published) await db().profile.updateMany({ where: { heroPath: (await db().media.findUniqueOrThrow({ where: { id } })).path }, data: { heroPath: null } });
    } else if (data.action === 'reorder') {
      const ids = z.array(z.string()).max(1000).parse(data.ids);
      if (new Set(ids).size !== ids.length) throw new Error('Orden inválido.');
      await db().$transaction(ids.map((id, position) => db().media.update({ where: { id }, data: { position } })));
    } else if (data.action === 'deleteMedia') {
      const item = await db().media.findUniqueOrThrow({ where: { id: z.string().parse(data.id) } });
      // Remove database references first; an interrupted storage cleanup cannot leave a broken public photo.
      await db().$transaction([db().profile.updateMany({ where: { heroPath: item.path }, data: { heroPath: null } }), db().media.delete({ where: { id: item.id } })]);
      const { error } = await storage().storage.from(bucket()).remove([item.path]);
      if (error) return Response.json({ error: 'Se retiró de la página, pero falta borrar el archivo en Storage.' }, { status: 500 });
    } else return Response.json({ error: 'Acción desconocida.' }, { status: 400 });
    return Response.json({ ok: true });
  } catch { return Response.json({ error: 'No se pudo completar la acción. Revisa los datos y la configuración.' }, { status: 400 }); }
}
