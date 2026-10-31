import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { parseMemorySubmission, readLimitedBody, validateMemoryPhoto, MAX_MEMORY_BODY_BYTES, MAX_MEMORY_PHOTO_BYTES, MAX_MEMORY_UPLOAD_PHOTO_BYTES, TARGET_MEMORY_PHOTO_BYTES } from '../lib/memory-input.ts';

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
  assert.equal(meta.format, 'webp'); assert.ok(meta.width <= 1920 && meta.height <= 1920); assert.ok(result.photos[0].length <= MAX_MEMORY_PHOTO_BYTES);
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
  await assert.rejects(validateMemoryPhoto(new File([new Uint8Array(MAX_MEMORY_UPLOAD_PHOTO_BYTES + 1)], 'foto.webp', { type: 'image/webp' })), /optimizarla automáticamente/);
});
test('large detailed photos over the old 500 KB threshold are reduced, not rejected', async () => {
  const pixels = Buffer.alloc(1200 * 900 * 3); let seed = 1234567;
  for (let i = 0; i < pixels.length; i++) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; pixels[i] = seed & 255; }
  const source = await sharp(pixels, { raw: { width: 1200, height: 900, channels: 3 } }).webp({ quality: 90 }).toBuffer();
  assert.ok(source.length > 500 * 1024); assert.ok(source.length < MAX_MEMORY_UPLOAD_PHOTO_BYTES);
  const result = await validateMemoryPhoto(new File([source], 'foto-detallada.webp', { type: 'image/webp' }));
  assert.ok(result.length <= TARGET_MEMORY_PHOTO_BYTES);
  const metadata = await sharp(result).metadata();
  assert.equal(metadata.format, 'webp'); assert.ok(Math.abs(metadata.width / metadata.height - 4 / 3) < .01);
  console.log(`Foto detallada: ${Math.round(source.length / 1024)} KB → ${Math.round(result.length / 1024)} KB; ${metadata.width}×${metadata.height}.`);
});
test('already-small WebP photos never grow during server optimization', async () => {
  const source = await photo();
  const result = await validateMemoryPhoto(new File([source], 'foto.webp', { type: 'image/webp' }));
  assert.ok(result.length <= source.length);
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
