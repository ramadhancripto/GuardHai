/**
 * GuardHai · mocks/transport.js
 * Offline stand-in for the REST transport, used only when
 * <meta name="guardhai:data-driver" content="mock"> is set (demos, screenshots).
 *
 * It answers READ requests from the local sample set and refuses WRITES, so a
 * demo can never create rows that look like real submissions.
 */
import { SAMPLE_POSTS } from '../data/seed-posts.js';

const json = (body, status = 200) =>
  Promise.resolve({ ok: status < 400, status, statusText: status < 400 ? 'OK' : 'Not Allowed',
    json: () => Promise.resolve(body) });

export async function mockFetch(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const path = String(url);

  if (method !== 'GET') {
    return json({ error: 'mock transport is read-only', simulated: true }, 405);
  }
  if (path.includes('/posts')) {
    return json(SAMPLE_POSTS.map((p) => ({ ...p, simulated: true })));
  }
  return json({ error: 'not found in mock transport', simulated: true }, 404);
}
