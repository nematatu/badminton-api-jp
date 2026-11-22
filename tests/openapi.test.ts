import { expect, it } from 'vitest'
import app from '../src/index'
import { authorSchema, venueSchema } from '../src/data'
import { errorSchema, venuePageSchema } from '../src/contracts'

it('serves a discoverable OpenAPI contract at the same origin', async () => {
  const root = await (await app.request('https://api.example/')).json() as any
  expect(root.baseUrl).toBe('https://api.example')
  expect(root.openapi).toBe('https://api.example/openapi.json')
  const res = await app.request(root.openapi)
  const doc = await res.json() as any
  expect(res.status).toBe(200)
  expect(doc.openapi).toBe('3.0.3')
  expect(doc.servers).toEqual([{ url: 'https://api.example' }])
  expect(doc.security).toEqual([])
  expect(doc.paths['/venues'].get.parameters.find((p: any) => p.name === 'perPage').schema).toMatchObject({ type: 'integer', maximum: 100, default: 10 })
  for (const path of ['/venues', '/venues/{id}', '/authors/{id}']) {
    expect(doc.paths[path].get.responses['304'].content).toBeUndefined()
    expect(doc.paths[path].get.responses['405'].headers.Allow).toBeDefined()
  }
})

it('returns responses satisfying the published shapes', async () => {
  const list = await (await app.request('https://api.example/venues')).json() as any
  expect(venuePageSchema.safeParse(list).success).toBe(true)
  const venue = await (await app.request('https://api.example/venues/' + list.venues[0].id)).json() as any
  expect(venueSchema.safeParse(venue.venue).success).toBe(true)
  const author = await (await app.request('https://api.example/authors/badminton-api')).json() as any
  expect(authorSchema.safeParse(author.author).success).toBe(true)
  for (const path of ['/missing', '/venues?page=0']) {
    expect(errorSchema.safeParse(await (await app.request('https://api.example' + path)).json()).success).toBe(true)
  }
})

it('returns JSON 405 and Allow for unsupported methods on known paths', async () => {
  for (const path of ['/', '/venues', '/venues/tokyo-metropolitan-main', '/authors/badminton-api', '/openapi.json']) {
    const res = await app.request('https://api.example' + path, { method: 'POST' })
    expect(res.status).toBe(405)
    expect(res.headers.get('Allow')).toBe('GET, HEAD, OPTIONS')
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect((await res.json() as any).code).toBe('METHOD_NOT_ALLOWED')
  }
})
