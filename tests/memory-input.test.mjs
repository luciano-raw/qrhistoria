import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { parseMemorySubmission, readLimitedBody, validateMemoryPhoto, MAX_MEMORY_BODY_BYTES, MAX_MEMORY_PHOTO_BYTES } from '../lib/memory-input.ts';

function request(data) { return new Request('https://example.test/api/memories', { method: 'POST', body: data }); }
function fields() { const data = new FormData(); data.set('name', 'Familia de prueba'); data.set('message', 'Un recuerdo para comprobar el formulario.'); data.set('website', ''); return data; }
async function photo() { return await sharp({ create: { width: 1500, height: 900, channels: 3, background: '#688455' } }).webp().toBuffer(); }

test('accepts text-only memories and trims names', async () => {
  const data = fields(); data.set('name', '  Familia  ');
  const result = await parseMemorySubmission(request(data));
  assert.equal(result.name, 'Familia'); assert.deepEqual(result.photos, []);
});
test('verifies and recompresses a real WebP before storage', async () => {
  const data = fields(); data.append('photos', new Blob([await photo()], { type: 'image/webp' }), 'foto.webp');
  const result = await parseMemorySubmission(request(data));
  const meta = await sharp(result.photos[0]).metadata();
  assert.equal(meta.format, 'webp'); assert.ok(meta.width <= 1200 && meta.height <= 1200); assert.ok(result.photos[0].length <= MAX_MEMORY_PHOTO_BYTES);
});
test('rejects more than three photos', async () => {
  const data = fields(); const bytes = await photo();
  for (let i = 0; i < 4; i++) data.append('photos', new Blob([bytes], { type: 'image/webp' }), `${i}.webp`);
  await assert.rejects(parseMemorySubmission(request(data)), /hasta tres/);
});
test('does not trust a file extension or MIME label', async () => {
  await assert.rejects(validateMemoryPhoto(new File(['not an image'], 'foto.webp', { type: 'image/webp' })), /no es válida/);
});
test('rejects oversized attachments before image decoding', async () => {
  await assert.rejects(validateMemoryPhoto(new File([new Uint8Array(MAX_MEMORY_PHOTO_BYTES + 1)], 'foto.webp', { type: 'image/webp' })), /máximo 500/);
});
test('rejects the honeypot and invalid text without accepting any photos', async () => {
  const data = fields(); data.set('website', 'spam');
  await assert.rejects(parseMemorySubmission(request(data)), /Escribe tu nombre/);
  const invalid = fields(); invalid.set('message', 'corto');
  await assert.rejects(parseMemorySubmission(request(invalid)), /Escribe tu nombre/);
});
test('enforces the body limit even without Content-Length', async () => {
  const oversized = request(new Uint8Array(MAX_MEMORY_BODY_BYTES + 1));
  await assert.rejects(readLimitedBody(oversized, MAX_MEMORY_BODY_BYTES), error => error.status === 413);
});
test('old text-only JSON clients still work during rollout', async () => {
  const result = await parseMemorySubmission(new Request('https://example.test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Familia', message: 'Un recuerdo compartido sin fotos.', website: '' }) }));
  assert.equal(result.photos.length, 0);
});
