// Check a local or deployed Worker: npm run smoke -- https://your-worker.workers.dev
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { setTimeout as delay } from 'node:timers/promises'

const base = (process.argv[2] || 'http://127.0.0.1:8787').replace(/\/$/, '')
const request = (path, options = {}) => fetch(base + path, { ...options, signal: AbortSignal.timeout(5000) })

if (process.argv.includes('--wait')) {
  const deadline = Date.now() + 30000
  let ready = false
  while (Date.now() < deadline) {
    try {
      const res = await fetch(base + '/', { signal: AbortSignal.timeout(1000) })
      await res.body?.cancel()
      if (res.ok) { ready = true; break }
    } catch { /* Wrangler may still be starting. */ }
    await delay(250)
  }
  assert.ok(ready, 'Worker did not become ready within 30 seconds.')
}

async function json(path) {
  const res = await request(path)
  assert.equal(res.status, 200, path)
  assert.ok(res.headers.get('content-type')?.includes('application/json'), path)
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*', path)
  console.log('OK', path)
  return { res, data: await res.json() }
}

const { data: root } = await json('/')
assert.equal(root.name, 'Badminton API Japan')
const { res, data } = await json('/venues?perPage=1')
assert.ok(data.totalCount > 0)
assert.equal(data.venues.length, 1)
assert.equal(data.pageInfo.nextPage, data.totalCount > 1 ? 2 : null)
const venue = data.venues[0]
assert.equal((await json('/venues/' + encodeURIComponent(venue.id))).data.venue.id, venue.id)
const [author] = JSON.parse(readFileSync(new URL('../content/authors.json', import.meta.url), 'utf8'))
assert.equal((await json('/authors/' + encodeURIComponent(author.id))).data.author.id, author.id)

const tag = res.headers.get('ETag')
assert.ok(tag)
const cached = await request('/venues?perPage=1', { headers: { 'If-None-Match': tag } })
assert.equal(cached.status, 304)
assert.equal(await cached.text(), '')
assert.equal(cached.headers.get('Access-Control-Allow-Origin'), '*')
assert.equal(cached.headers.get('Cache-Control'), 'public, max-age=300')
assert.equal((await request('/venues?page=0')).status, 400)
assert.equal((await request('/venues?page=1&page=2')).status, 400)
assert.equal((await request('/missing')).status, 404)
console.log('OK conditional GET, invalid parameters and JSON 404')
