export type Profile = { name: string; subtitle: string; introduction: string; quote: string; heroPath: string | null };
export type Media = { id: string; title: string; caption: string; year: string; kind: string; path: string; bytes: number; position: number; published: boolean };
export type Memory = { id: string; name: string; message: string; approved: boolean; createdAt: string };
export const initialProfile: Profile = { name: 'Una vida que nos une', subtitle: 'Un lugar para guardar lo que nunca queremos olvidar.', introduction: 'Aquí iremos reuniendo su historia: los días compartidos, las pequeñas costumbres y todo ese cariño que sigue encontrando nuevas formas de acompañarnos.', quote: 'Lo que se comparte con amor se queda con nosotros.', heroPath: null };
export function mediaUrl(path: string) { return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'memorias'}/${path}`; }
export const formatBytes = (n: number) => n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
