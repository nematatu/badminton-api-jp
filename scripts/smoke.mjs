// Run against `npm run dev` or a deployed Worker.
import assert from 'node:assert/strict'
const base = process.argv[2] || 'http://127.0.0.1:8787'
for (const path of ['/', '/venues?perPage=2', '/venues/tokyo-metropolitan-main', '/authors/badminton-api']) {
  const res = await fetch(base + path)
  assert.equal(res.status, 200, path)
  assert.ok(res.headers.get('content-type')?.includes('application/json'), path)
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*', path)
  const data = await res.json()
  if (path === '/venues?perPage=2') {
    assert.equal(data.venues.length, 2)
    assert.equal(data.pageInfo.nextPage, 2)
  }
  console.log('OK', path)
}
assert.equal((await fetch(base + '/missing')).status, 404)
console.log('OK JSON 404')
