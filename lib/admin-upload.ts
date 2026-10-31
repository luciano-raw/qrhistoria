'use client';
import { supabase } from './browser';
export type AdminAPI = (body: object) => Promise<{ path?: string; token?: string; warning?: string }>;
export async function saveAdminImage(api: AdminAPI, blob: Blob, target: string) {
  const signed = await api({ action: 'upload', value: { kind: 'image', bytes: blob.size } });
  if (!signed.path || !signed.token) throw new Error('No pudimos preparar la subida.');
  try {
    const { error } = await supabase().storage.from(process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'memorias').uploadToSignedUrl(signed.path, signed.token, blob, { contentType: 'image/webp', cacheControl: '31536000' });
    if (error) throw new Error('No pudimos subir la fotografía. Inténtalo otra vez.');
    return await api(target === 'hero' || target === 'new'
      ? { action: 'createMedia', value: { title: target === 'hero' ? 'Fotografía de portada' : 'Un momento para recordar', caption: '', year: '', kind: 'image', path: signed.path, published: true, asHero: target === 'hero' } }
      : { action: 'replaceMedia', value: { id: target, path: signed.path } });
  } catch (error) {
    // The server refuses to discard a path already referenced by a saved photograph.
    await api({ action: 'discardUpload', path: signed.path }).catch(() => {});
    throw error;
  }
}
