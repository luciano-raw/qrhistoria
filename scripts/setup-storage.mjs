import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import supabaseCA from '../lib/supabase-ca.mjs';

const client = new pg.Client({ connectionString: process.env.DIRECT_URL, connectionTimeoutMillis: 15000, ssl: { ca: supabaseCA, rejectUnauthorized: true } });
try {
  if (!process.env.DIRECT_URL) throw new Error('Falta DIRECT_URL en .env');
  await client.connect();
  await client.query('BEGIN');
  await client.query(await readFile(new URL('../supabase/setup.sql', import.meta.url), 'utf8'));
  await client.query('COMMIT');
  console.log('RLS, permisos de tablas y bucket memorias configurados.');
} catch (error) {
  try { await client.query('ROLLBACK'); } catch { /* No active transaction if connection failed. */ }
  console.error(`No se completó la configuración: ${error instanceof Error ? error.message : 'error de conexión'}`);
  process.exitCode = 1;
} finally { await client.end(); }
