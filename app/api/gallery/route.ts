import { getGallery } from '@/lib/gallery';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { return Response.json({ photos: await getGallery() }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return Response.json({ error: 'No pudimos actualizar las fotografías.' }, { status: 503 }); }
}
