import Memorial from '@/components/memorial';
import { configured, db } from '@/lib/server';
import { initialProfile } from '@/lib/shared';
export const dynamic = 'force-dynamic';
export default async function Page() {
  if (!configured()) return <Memorial profile={initialProfile} media={[]} memories={[]} demo />;
  try {
    const [profile, media, memories] = await Promise.all([db().profile.findUnique({ where: { id: 'main' } }), db().media.findMany({ where: { published: true }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] }), db().memory.findMany({ where: { approved: true }, orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, name: true, message: true, approved: true, createdAt: true, photos: { select: { path: true, bytes: true }, orderBy: { position: 'asc' } } } })]);
    return <Memorial profile={profile ? { ...profile, content: profile.content as Record<string, string> } : initialProfile} media={media} memories={memories.map(m => ({ ...m, createdAt: m.createdAt.toISOString() }))} demo={false} />;
  } catch { return <main className="setup"><h1>Este lugar se está preparando.</h1><p>Vuelve en un momento. Estamos cuidando cada detalle.</p></main>; }
}
