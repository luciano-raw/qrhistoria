import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import supabaseCA from '../lib/supabase-ca.mjs';
import { reserveMemorySubmission } from '../lib/memory-input.ts';
const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 15000, ssl: { ca: supabaseCA, rejectUnauthorized: true } }), transactionOptions: { maxWait: 15000, timeout: 10000 } });
const fingerprint = `test-${randomUUID()}`;
try {
  const rollback = new Error('rollback-only');
  try {
    await client.$transaction(async tx => {
      const memory = await tx.memory.create({ data: { name: 'Prueba técnica', message: 'Esta prueba nunca se publicará: la transacción se revierte.', fingerprint, photos: { create: { path: `tests/${randomUUID()}.webp`, bytes: 10 } } }, include: { photos: true } });
      assert.equal(memory.approved, true); assert.equal(memory.photos.length, 1);
      await tx.memory.update({ where: { id: memory.id }, data: { approved: false } });
      assert.equal(await tx.memory.count({ where: { id: memory.id, approved: true } }), 0);
      throw rollback;
    });
  } catch (error) { if (error !== rollback) throw error; }
  const attempts = await Promise.allSettled(Array.from({ length: 6 }, () => reserveMemorySubmission(client, fingerprint, 0, 0)));
  const unexpected = attempts.filter(result => result.status === 'rejected' && result.reason.status !== 429);
  if (unexpected.length) console.error('Errores inesperados en concurrencia:', unexpected.map(result => ({ code: result.reason.code, message: result.reason.message })));
  assert.equal(attempts.filter(result => result.status === 'fulfilled').length, 5);
  const denied = attempts.find(result => result.status === 'rejected');
  assert.equal(denied.reason.status, 429);
  await assert.rejects(reserveMemorySubmission(client, `${fingerprint}-budget`, 1, 0), error => error.status === 507);
  assert.equal(await client.submissionLimit.count({ where: { fingerprint: `${fingerprint}-budget` } }), 0);
  console.log('Correcto: recuerdos con fotos y ocultamiento (transacción revertida), límite atómico bajo concurrencia y rechazo de fotos sin presupuesto. No se publicaron recuerdos ni archivos.');
} catch (error) {
  console.error('Verificación fallida:', error.code || error.name, error.message.split('\n').filter(Boolean).at(-1));
  process.exitCode = 1;
} finally {
  await client.submissionLimit.deleteMany({ where: { fingerprint: { in: [fingerprint, `${fingerprint}-budget`] } } });
  await client.$disconnect();
}
