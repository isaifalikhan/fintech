/**
 * API-001 smoke check — run when your REST API is listening.
 * Usage:
 *   node scripts/check-api-001.mjs
 *   node scripts/check-api-001.mjs http://127.0.0.1:3001/api/v1
 *
 * Expects GET /auth/session (may 401/403) and POST /auth/login to exist (not 404).
 */

const base = (process.argv[2] || 'http://127.0.0.1:3001/api/v1').replace(/\/$/, '');

async function req(path, init) {
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, { ...init, credentials: 'include' });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text?.slice(0, 300);
  }
  return { url, status: res.status, body };
}

async function main() {
  console.log(`API-001 check → base: ${base}\n`);

  try {
    const session = await req('/auth/session', { method: 'GET' });
    console.log(`GET  /auth/session     → ${session.status}`, typeof session.body === 'object' ? JSON.stringify(session.body).slice(0, 120) + '…' : session.body);

    const login = await req('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent-check@example.com',
        password: 'invalid',
      }),
    });
    console.log(`POST /auth/login       → ${login.status}`, typeof login.body === 'object' ? JSON.stringify(login.body).slice(0, 120) : String(login.body).slice(0, 120));

    if (login.status === 404) {
      console.error('\nFAIL: POST /auth/login returned 404 — route missing or wrong base path.');
      process.exit(1);
    }

    console.log('\nOK: Auth routes respond (adjust success criteria when backend is finalized).');
  } catch (e) {
    console.error('\nFAIL:', e.message);
    console.error('Hint: start your API (e.g. port 3001) and set the correct base URL.');
    process.exit(1);
  }
}

main();
