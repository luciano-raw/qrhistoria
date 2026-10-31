'use client';
import { supabase } from './browser';
import { isSectionSlot, sectionSlots } from './sections';
export type AdminAPI = (body: object) => Promise<{ path?: string; token?: string; warning?: string }>;
export async function saveAdminImage(api: AdminAPI, blob: Blob, target: string, details: { title?: string; caption?: string } = {}) {
  const slot = target.startsWith('slot:') ? target.slice(5) : '';
  if (slot && !isSectionSlot(slot)) throw new Error('Espacio de fotografía inválido.');
  const signed = await api({ action: 'upload', value: { kind: 'image', bytes: blob.size } });
  if (!signed.path || !signed.token) throw new Error('No pudimos preparar la subida.');
  try {
    const { error } = await supabase().storage.from(process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'memorias').uploadToSignedUrl(signed.path, signed.token, blob, { contentType: 'image/webp', cacheControl: '31536000' });
    if (error) throw new Error('No pudimos subir la fotografía. Inténtalo otra vez.');
    return await api(target === 'hero' || target === 'new' || target === 'gallery:new' || slot
      ? { action: 'createMedia', value: { title: details.title || (target === 'hero' ? 'Fotografía de portada' : isSectionSlot(slot) ? sectionSlots[slot].label : 'Un momento para recordar'), caption: details.caption || '', year: '', kind: 'image', path: signed.path, published: true, asHero: target === 'hero', placement: slot || (target === 'gallery:new' ? 'gallery' : 'album') } }
      : { action: 'replaceMedia', value: { id: target, path: signed.path } });
  } catch (error) {
    // The server refuses to discard a path already referenced by a saved photograph.
    await api({ action: 'discardUpload', path: signed.path }).catch(() => {});
    throw error;
  }
}
