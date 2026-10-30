import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Exercise the exact first-paint script shipped in the document, without a browser or network.
const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');
const script = layout.split('const themeScript = `')[1].split('`;')[0];
function initialTheme(saved, systemDark, storageUnavailable = false) {
  const document = { documentElement: { dataset: {} } };
  runInNewContext(script, { document, localStorage: { getItem() { if (storageUnavailable) throw new Error('Storage unavailable'); return saved; } }, matchMedia() { return { matches: systemDark }; } });
  return document.documentElement.dataset.theme;
}
test('an explicit theme wins over the system preference', () => {
  assert.equal(initialTheme('light', true), 'light');
  assert.equal(initialTheme('dark', false), 'dark');
});
test('new visitors follow the system theme', () => {
  assert.equal(initialTheme(null, true), 'dark');
  assert.equal(initialTheme(null, false), 'light');
});
test('blocked local storage still produces a usable system theme', () => {
  assert.equal(initialTheme(null, true, true), 'dark');
  assert.equal(initialTheme(null, false, true), 'light');
});
