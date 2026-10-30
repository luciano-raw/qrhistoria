import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sameOrigin } from '../lib/server.ts';

test('accepts the public Host when Next reconstructs an internal URL', () => {
  const request = new Request('http://localhost:3012/api/memories', { headers: { host: '127.0.0.1:3012', origin: 'http://127.0.0.1:3012' } });
  assert.equal(sameOrigin(request), true);
});
test('rejects an unrelated origin, missing origin and invalid origin', () => {
  for (const origin of ['https://unrelated.example', 'null', 'not-a-url', '']) {
    const request = new Request('https://memorias.example/api/memories', { headers: { host: 'memorias.example', ...(origin ? { origin } : {}) } });
    assert.equal(sameOrigin(request), false);
  }
});
test('does not trust a forged forwarded host', () => {
  const request = new Request('https://memorias.example/api/memories', { headers: { host: 'memorias.example', origin: 'https://unrelated.example', 'x-forwarded-host': 'unrelated.example' } });
  assert.equal(sameOrigin(request), false);
});
