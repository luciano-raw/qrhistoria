import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectGalleryPhotos, slideDuration, slideIndex } from '../lib/gallery-selection.mjs';

const image = (id, extra = {}) => ({ id, path: `${id}.webp`, title: id, caption: 'Una frase', kind: 'image', published: true, ...extra });
test('gallery includes published photos from all home sections and exclusive gallery uploads', () => {
  const photos = selectGalleryPhotos([image('hero'), image('story'), image('gallery'), image('draft', { published: false }), image('video', { kind: 'video' })], []);
  assert.deepEqual(photos.map(photo => photo.id), ['family:hero', 'family:story', 'family:gallery']);
});
test('hidden visitor memories cannot leak their photos into the gallery or presentation', () => {
  const photos = selectGalleryPhotos([], [{ id: 'yes', path: 'recuerdos/yes.webp', memory: { name: 'Familia', approved: true } }, { id: 'hidden', path: 'recuerdos/hidden.webp', memory: { name: 'Oculto', approved: false } }]);
  assert.equal(photos.length, 1); assert.equal(photos[0].credit, 'Familia'); assert.equal(photos[0].source, 'visitors');
});
test('one stored photo appears only once and the gallery does not inherit the home memory limit', () => {
  const media = Array.from({ length: 250 }, (_, index) => image(String(index)));
  const photos = selectGalleryPhotos([...media, image('duplicate', { path: '0.webp' })], []);
  assert.equal(photos.length, 250);
});
test('presentation continuously wraps in both directions and handles a single or empty collection', () => {
  assert.equal(slideIndex(2, 1, 3), 0); assert.equal(slideIndex(0, -1, 3), 2);
  assert.equal(slideIndex(0, 1, 1), 0); assert.equal(slideIndex(0, 1, 0), 0);
  let index = 0; for (let i = 0; i < 300; i++) index = slideIndex(index, 1, 3);
  assert.equal(index, 0);
});
test('invalid saved playback durations cannot create a tight timer loop', () => {
  for (const invalid of ['', null, 'not-a-number', 0, -1, Infinity, 10000]) assert.equal(slideDuration(invalid), 8);
  assert.equal(slideDuration('3'), 3); assert.equal(slideDuration('30'), 30); assert.equal(slideDuration('9.4'), 9);
});
