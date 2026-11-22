import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { etag, RETAINED_304_HEADERS } from 'hono/etag'
import { prettyJSON } from 'hono/pretty-json'
import { z } from 'zod'
import { authors, listVenues, venues } from './data'
import { parseQuery } from './query'
import { openapi } from './openapi'
import { version } from '../package.json'

const app = new Hono()
app.use('*', cors({ origin: '*', allowMethods: ['GET', 'HEAD', 'OPTIONS'], exposeHeaders: ['ETag'] }))
app.use('*', async (c, next) => {
  await next()
  const cacheable = ['GET', 'HEAD'].includes(c.req.method) && [200, 304].includes(c.res.status)
  c.header('Cache-Control', cacheable ? 'public, max-age=300' : 'no-store')
})
app.use('*', etag({
  retainedHeaders: [...RETAINED_304_HEADERS, 'access-control-allow-origin', 'access-control-expose-headers'],
}))
app.use('*', prettyJSON())

app.get('/', (c) => c.json({
  name: 'Badminton API Japan',
  version,
  baseUrl: new URL(c.req.url).origin,
  openapi: new URL('/openapi.json', c.req.url).href,
  venueCount: venues.length,
  endpoints: ['/venues', '/venues/:id', '/authors/:id'],
  docs: 'https://github.com/nematatu/badminton-api-jp#readme',
}))

app.get('/openapi.json', (c) => c.json(openapi(new URL(c.req.url).origin)))

app.get('/venues', (c) => c.json(listVenues(parseQuery(new URL(c.req.url).searchParams))))

app.get('/venues/:id', (c) => {
  const venue = venues.find((v) => v.id === c.req.param('id'))
  return venue ? c.json({ venue }) : c.json({ code: 'NOT_FOUND', error: 'Venue not found.' }, 404)
})

app.get('/authors/:id', (c) => {
  const author = authors.find((a) => a.id === c.req.param('id'))
  return author ? c.json({ author }) : c.json({ code: 'NOT_FOUND', error: 'Author not found.' }, 404)
})

for (const path of ['/', '/venues', '/venues/:id', '/authors/:id', '/openapi.json']) app.all(path, (c) => {
  c.header('Allow', 'GET, HEAD, OPTIONS')
  return c.json({ code: 'METHOD_NOT_ALLOWED', error: 'Use GET, HEAD or OPTIONS.' }, 405)
})

app.notFound((c) => c.json({ code: 'NOT_FOUND', error: 'Endpoint not found.' }, 404))
app.onError((error, c) => {
  if (error instanceof z.ZodError) {
    return c.json({ code: 'INVALID_QUERY', error: 'Invalid query parameter.', details: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })) }, 400)
  }
  console.error(error)
  return c.json({ code: 'INTERNAL_ERROR', error: 'Internal server error.' }, 500)
})

export default app
