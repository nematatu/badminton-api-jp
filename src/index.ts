import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { prettyJSON } from 'hono/pretty-json'
import { z } from 'zod'
import { authors, listVenues, venues } from './data'
import { parseQuery } from './query'

const app = new Hono()
app.use('*', cors({ origin: '*', allowMethods: ['GET', 'HEAD', 'OPTIONS'] }))
app.use('*', prettyJSON())

app.get('/', (c) => c.json({
  name: 'Badminton API Japan',
  venueCount: venues.length,
  endpoints: ['/venues', '/venues/:id', '/authors/:id'],
  docs: 'https://github.com/nematatu/badminton-api-jp#readme',
}))

app.get('/venues', (c) => c.json(listVenues(parseQuery(new URL(c.req.url).searchParams))))

app.get('/venues/:id', (c) => {
  const venue = venues.find((v) => v.id === c.req.param('id'))
  return venue ? c.json({ venue }) : c.json({ error: 'Venue not found.' }, 404)
})

app.get('/authors/:id', (c) => {
  const author = authors.find((a) => a.id === c.req.param('id'))
  return author ? c.json({ author }) : c.json({ error: 'Author not found.' }, 404)
})

app.notFound((c) => c.json({ error: 'Endpoint not found.' }, 404))
app.onError((error, c) => {
  if (error instanceof z.ZodError) {
    return c.json({ error: 'Invalid query parameter.', details: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })) }, 400)
  }
  console.error(error)
  return c.json({ error: 'Internal server error.' }, 500)
})

export default app
