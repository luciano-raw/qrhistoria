import { z } from 'zod';
import { bucket, db, isAdmin, sameOrigin, storage } from '@/lib/server';
const profileSchema = z.object({ name: z.string().trim().min(1).max(120), subtitle: z.string().max(300), introduction: z.string().max(6000), quote: z.string().max(600), heroPath: z.string().nullable(), content: z.record(z.string().max(80), z.string().max(3000)).refine(value => Object.keys(value).length <= 60).optional() });
async function retireHero(path: string | null | undefined) {
  if (!path) return;
  try {
    const previous = await db().media.findFirst({ where: { path, placement: 'hero' } });
    if (!previous || await db().profile.count({ where: { heroPath: path } })) return;
    await db().media.deleteMany({ where: { id: previous.id } });
    const { error } = await storage().storage.from(bucket()).remove([path]);
    if (error) return 'La portada se actualizó. Falta retirar el archivo anterior desde Storage.';
  } catch { return 'La portada se actualizó. Revisa la limpieza del archivo anterior en Storage.'; }
}
export async function GET(request: Request) {
  if (!await isAdmin(request)) return Response.json({ error: 'Acceso no autorizado.' }, { status: 401 });
  try {
    const [profile, media, memories] = await Promise.all([db().profile.findUnique({ where: { id: 'main' } }), db().media.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] }), db().memory.findMany({ orderBy: { createdAt: 'desc' }, take: 500, select: { id: true, name: true, message: true, approved: true, createdAt: true, photos: { select: { path: true, bytes: true }, orderBy: { position: 'asc' } } } })]);
    return Response.json({ profile, media, memories });
  } catch { return Response.json({ error: 'No pudimos cargar el panel. Revisa la conexión de la base de datos.' }, { status: 500 }); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request) || !await isAdmin(request)) return Response.json({ error: 'Acceso no autorizado.' }, { status: 401 });
  try {
    if (Number(request.headers.get('content-length') || 0) > 48000) return Response.json({ error: 'Solicitud demasiado grande.' }, { status: 413 });
    const raw = await request.text();
    if (raw.length > 48000) return Response.json({ error: 'Solicitud demasiado grande.' }, { status: 413 });
    const data = JSON.parse(raw);
    if (data.action === 'profile') {
      const value = profileSchema.parse(data.value);
      if (value.heroPath && !await db().media.findFirst({ where: { path: value.heroPath, kind: 'image', published: true } })) throw new Error('Selecciona una foto publicada para la portada.');
      const previous = await db().profile.findUnique({ where: { id: 'main' } });
      await db().profile.upsert({ where: { id: 'main' }, create: { id: 'main', ...value }, update: value });
      if (previous?.heroPath !== value.heroPath) { const warning = await retireHero(previous?.heroPath); if (warning) return Response.json({ ok: true, warning }); }
    } else if (data.action === 'memory') {
      const value = z.object({ id: z.string(), approved: z.boolean() }).parse(data.value);
      await db().memory.update({ where: { id: value.id }, data: { approved: value.approved } });
    } else if (data.action === 'deleteMemory') {
      const memory = await db().memory.findUniqueOrThrow({ where: { id: z.string().parse(data.id) }, include: { photos: true } });
      await db().memory.delete({ where: { id: memory.id } });
      if (memory.photos.length) {
        const { error } = await storage().storage.from(bucket()).remove(memory.photos.map(photo => photo.path));
        if (error) return Response.json({ error: 'El recuerdo se eliminó; falta limpiar sus fotos desde Storage.' }, { status: 500 });
        const bytes = memory.photos.reduce((sum, photo) => sum + photo.bytes, 0);
        await db().$executeRaw`UPDATE "UploadBudget" SET "usedBytes" = GREATEST(0, "usedBytes" - ${bytes}) WHERE "id" = 'memories'`;
      }
    } else if (data.action === 'upload') {
      const value = z.object({ kind: z.enum(['image', 'video']), bytes: z.number().int().positive().max(25 * 1024 * 1024) }).parse(data.value);
      if (value.kind === 'image' && value.bytes > 2 * 1024 * 1024) throw new Error('La imagen debe pesar menos de 2 MB.');
      const path = `${crypto.randomUUID()}.${value.kind === 'image' ? 'webp' : 'mp4'}`;
      const { data: signed, error } = await storage().storage.from(bucket()).createSignedUploadUrl(path);
      if (error) throw error;
      return Response.json({ path, token: signed.token });
    } else if (data.action === 'createMedia') {
      const value = z.object({ title: z.string().trim().min(1).max(150), caption: z.string().max(2000), year: z.string().max(40), kind: z.enum(['image', 'video']), path: z.string().regex(/^[a-f0-9-]{36}\.(webp|mp4)$/), published: z.boolean().optional(), asHero: z.boolean().optional() }).parse(data.value);
      if (!value.path.endsWith(value.kind === 'image' ? '.webp' : '.mp4')) throw new Error('Formato incorrecto.');
      const { data: info, error } = await storage().storage.from(bucket()).info(value.path);
      if (error || !info) throw new Error('No encontramos el archivo subido.');
      const bytes = Number(info.size);
      if (!Number.isFinite(bytes) || bytes <= 0 || bytes > (value.kind === 'image' ? 2 : 25) * 1024 * 1024) throw new Error('El archivo excede el límite.');
      const last = await db().media.aggregate({ _max: { position: true } });
      if (value.asHero && value.kind !== 'image') throw new Error('La portada requiere una foto.');
      const oldHero = value.asHero ? await db().profile.findUnique({ where: { id: 'main' } }) : null;
      const { asHero, ...fields } = value;
      await db().$transaction(async tx => {
        await tx.media.create({ data: { ...fields, bytes, published: asHero ? true : !!value.published, placement: asHero ? 'hero' : 'album', position: (last._max.position ?? -1) + 1 } });
        if (asHero) await tx.profile.upsert({ where: { id: 'main' }, create: { id: 'main', heroPath: value.path }, update: { heroPath: value.path } });
      });
      const warning = await retireHero(oldHero?.heroPath); if (warning) return Response.json({ ok: true, warning });
    } else if (data.action === 'replaceMedia') {
      const value = z.object({ id: z.string(), path: z.string().regex(/^[a-f0-9-]{36}\.webp$/) }).parse(data.value);
      const previous = await db().media.findUniqueOrThrow({ where: { id: value.id } });
      if (previous.kind !== 'image' || previous.path === value.path) throw new Error('Reemplazo inválido.');
      const { data: info, error } = await storage().storage.from(bucket()).info(value.path);
      const bytes = Number(info?.size);
      if (error || !bytes || bytes > 2 * 1024 * 1024) throw new Error('Archivo inválido.');
      if (await db().media.count({ where: { path: value.path } })) throw new Error('El archivo ya está en uso.');
      await db().$transaction([db().media.update({ where: { id: previous.id }, data: { path: value.path, bytes } }), db().profile.updateMany({ where: { heroPath: previous.path }, data: { heroPath: value.path } })]);
      const { error: cleanupError } = await storage().storage.from(bucket()).remove([previous.path]);
      if (cleanupError) return Response.json({ ok: true, warning: 'La foto se actualizó. Falta retirar el archivo anterior desde Storage.' });
    } else if (data.action === 'discardUpload') {
      const path = z.string().regex(/^[a-f0-9-]{36}\.(webp|mp4)$/).parse(data.path);
      if (await db().media.count({ where: { path } })) throw new Error('El archivo está en uso.');
      const { error } = await storage().storage.from(bucket()).remove([path]);
      if (error) throw error;
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
