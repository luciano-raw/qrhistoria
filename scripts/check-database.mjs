import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import supabaseCA from '../lib/supabase-ca.mjs';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 15000, ssl: { ca: supabaseCA, rejectUnauthorized: true } }) });
try {
  const counts = await Promise.all([prisma.profile.count(), prisma.media.count(), prisma.memory.count()]);
  const protection = await prisma.$queryRaw`SELECT relname, relrowsecurity, has_table_privilege('anon', oid, 'SELECT') AS anon_select, has_table_privilege('authenticated', oid, 'SELECT') AS authenticated_select FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relname IN ('Profile', 'Media', 'Memory', 'MemoryPhoto', 'SubmissionLimit', 'UploadBudget')`;
  const buckets = await prisma.$queryRaw`SELECT id, public, file_size_limit FROM storage.buckets WHERE id = 'memorias'`;
  if (protection.length !== 6 || protection.some(row => !row.relrowsecurity || row.anon_select || row.authenticated_select)) throw new Error('Faltan protecciones en las tablas. Ejecuta db:setup-storage.');
  if (buckets.length !== 1) throw new Error('Falta el bucket memorias.');
  console.log(JSON.stringify({ connected: true, tlsVerified: true, rows: { profiles: counts[0], media: counts[1], memories: counts[2] }, tablesProtected: true, bucket: buckets[0] }, (_key, value) => typeof value === 'bigint' ? Number(value) : value, 2));
} catch (error) {
  console.error(`Comprobación fallida: ${error instanceof Error ? error.message : 'error de conexión'}`);
  process.exitCode = 1;
} finally { await prisma.$disconnect(); }
