import type { Metadata } from 'next';
import Gallery from '@/components/gallery';
import { getGallery } from '@/lib/gallery';
import { configured, db } from '@/lib/server';
import { initialProfile } from '@/lib/shared';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Galería · Siempre cerca' };
export default async function GalleryPage() {
  try {
    const [photos, profile] = await Promise.all([getGallery(), configured() ? db().profile.findUnique({ where: { id: 'main' } }) : Promise.resolve(null)]);
    return <Gallery initialPhotos={photos} profile={profile ? { ...profile, content: profile.content as Record<string, string> } : initialProfile} />;
  } catch { return <main className="setup"><h1>Estamos preparando la galería.</h1><p>Inténtalo nuevamente en un momento.</p><a className="button" href="/">Volver a la historia</a></main>; }
}
