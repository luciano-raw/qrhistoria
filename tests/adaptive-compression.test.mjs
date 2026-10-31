import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adaptiveCompression } from '../lib/adaptive-compression.mjs';

test('keeps dimensions and high quality when the image already fits', async () => {
  let calls = 0;
  const result = await adaptiveCompression(async (width, height, quality) => { calls++; return { size: 1000, width, height, quality }; }, { width: 1000, height: 750 });
  assert.equal(calls, 1); assert.equal(result.width, 1000); assert.equal(result.quality, .84);
});
test('automatically downsizes difficult photos rather than failing the upload', async () => {
  const sizes = [];
  const result = await adaptiveCompression(async (width, height, quality) => { sizes.push([width, height]); return { size: Math.ceil(width * height * quality), width, height, quality }; }, { width: 8000, height: 6000, maxDimension: 1920, targetBytes: 200 * 1024, maxBytes: 500 * 1024 });
  assert.ok(result.size <= 200 * 1024); assert.ok(result.quality >= .68);
  assert.ok(sizes.some(([width]) => width < 1920)); assert.ok(Math.abs(result.width / result.height - 4 / 3) < .01);
});
test('a preferred target is not a false hard rejection when a safe result exists', async () => {
  const result = await adaptiveCompression(async () => ({ size: 300 }), { width: 800, height: 600, targetBytes: 200, maxBytes: 500 });
  assert.equal(result.size, 300);
});
