import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import ca from '../lib/supabase-ca.mjs';
const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 15000, ssl: { ca, rejectUnauthorized: true } }), transactionOptions: { maxWait: 15000, timeout: 10000 } });
const rollback = new Error('rollback-only');
try {
  try {
    await client.$transaction(async tx => {
      const locked = await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'photo-slot:integration-test'}))::text AS locked`;
      assert.equal(locked.length, 1);
      const media = await tx.media.create({ data: { title: 'Prueba no publicada', caption: 'Frase de prueba', kind: 'image', path: `tests/${randomUUID()}.webp`, bytes: 10, placement: 'story-1', published: true } });
      assert.equal(media.placement, 'story-1');
      const changed = await tx.media.update({ where: { id: media.id }, data: { caption: 'Frase actualizada' } });
      assert.equal(changed.caption, 'Frase actualizada');
      throw rollback;
    });
  } catch (error) { if (error !== rollback) throw error; }
  console.log('Correcto: bloqueo de espacios de fotos, asignación de sección y frase editable. Transacción revertida; no se publicaron datos ni archivos.');
} catch (error) { console.error('Comprobación fallida:', error.code || error.name, error.message.split('\n').filter(Boolean).at(-1)); process.exitCode = 1; }
finally { await client.$disconnect(); }
