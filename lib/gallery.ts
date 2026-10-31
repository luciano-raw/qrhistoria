import 'server-only';
import { configured, db } from './server';
import { selectGalleryPhotos } from './gallery-selection.mjs';
export async function getGallery() {
  if (!configured()) return [];
  const [media, photos] = await Promise.all([
    db().media.findMany({ where: { kind: 'image', published: true }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }], select: { id: true, path: true, title: true, caption: true, kind: true, published: true } }),
    db().memoryPhoto.findMany({ where: { memory: { approved: true } }, orderBy: [{ memory: { createdAt: 'asc' } }, { position: 'asc' }, { id: 'asc' }], select: { id: true, path: true, memory: { select: { name: true, approved: true } } } }),
  ]);
  return selectGalleryPhotos(media, photos);
}
