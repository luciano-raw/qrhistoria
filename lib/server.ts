import 'server-only';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createClient } from '@supabase/supabase-js';
import supabaseCA from './supabase-ca.mjs';
const globalDb = globalThis as unknown as { db?: PrismaClient };
export const configured = () => Boolean(process.env.DATABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.ADMIN_EMAIL && process.env.RATE_LIMIT_SECRET);
export function db() {
  if (!process.env.DATABASE_URL) throw new Error('Base de datos sin configurar');
  return globalDb.db ??= new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 15000, idleTimeoutMillis: 20000, ssl: { ca: supabaseCA, rejectUnauthorized: true } }) });
}
export function storage() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } }); }
export async function isAdmin(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token || !configured()) return false;
  const { data, error } = await storage().auth.getUser(token);
  return !error && !!data.user?.email_confirmed_at && data.user.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const source = new URL(origin);
    // Next.js may reconstruct request.url with an internal hostname behind a proxy.
    // Host represents the browser-facing authority and must be preserved by the hosting proxy.
    const host = request.headers.get('host') || new URL(request.url).host;
    return ['http:', 'https:'].includes(source.protocol) && source.host.toLowerCase() === host.toLowerCase();
  } catch { return false; }
}
export const bucket = () => process.env.SUPABASE_STORAGE_BUCKET || 'memorias';
