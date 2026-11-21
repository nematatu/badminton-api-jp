import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { etag } from 'hono/etag'
import { secureHeaders } from 'hono/secure-headers'
import { bodyLimit } from 'hono/body-limit'
import { z } from 'zod'
import { authors, venues, listVenues, serializeVenue } from './data'
import { paginationSchema, runGraphQL } from './graphql'
import { openapi } from './openapi'

const app = new Hono<{Bindings: {ASSETS: Fetcher}}>()
app.use('*', cors({origin: '*', allowMethods: ['GET', 'HEAD', 'POST', 'OPTIONS'], allowHeaders: ['Content-Type'], exposeHeaders: ['ETag'], maxAge: 86400}))
app.use('*', secureHeaders({contentSecurityPolicy: {defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"], imgSrc: ["'self'"], connectSrc: ["'self'"], frameAncestors: ["'none'"]}}))
app.use('*', async (c,next) => {
  await next()
  if (c.req.method === 'GET' && c.res.status === 200) c.header('Cache-Control', 'public, max-age=300')
  else c.header('Cache-Control', 'no-store')
})
app.use('*', etag())
app.use('/graphql', bodyLimit({maxSize: 16384, onError: (c) => c.json({error: {code:'PAYLOAD_TOO_LARGE', message:'Body must be at most 16 KiB.'}},413)}))
app.get('/health', (c) => c.json({status:'ok', version:'0.1.0', venueCount:venues.length}))
app.get('/openapi.json', (c) => c.json(openapi(new URL(c.req.url).origin)))
app.get('/venues', (c) => {
  const params = c.req.query()
  const parsed = paginationSchema.parse({page: params.page === undefined ? undefined : Number(params.page),
    perPage: params.perPage === undefined ? undefined : Number(params.perPage), prefecture: params.prefecture, q: params.q})
  const result = listVenues(parsed, new URL(c.req.url).origin)
  return c.body(JSON.stringify(result, null, c.req.query('pretty') === undefined ? 0 : 2),200,{'Content-Type':'application/json; charset=UTF-8'})
})
app.get('/venues/:id', (c) => {
  const venue = venues.find((v) => v.id === c.req.param('id'))
  if (!venue) return c.json({error:{code:'NOT_FOUND',message:'Venue not found.'}},404)
  return c.body(JSON.stringify({venue:serializeVenue(venue,new URL(c.req.url).origin)},null,c.req.query('pretty') === undefined ? 0 : 2),200,{'Content-Type':'application/json; charset=UTF-8'})
})
app.get('/prefectures', (c) => c.json({prefectures:[...new Set(venues.map((v) => v.prefecture))].map((name) => ({name,venueCount: venues.filter((v) => v.prefecture === name).length}))}))
app.get('/authors', (c) => c.json({authors}))
app.get('/authors/:id', (c) => {
  const author = authors.find((a) => a.id === c.req.param('id'))
  return author ? c.json({author}) : c.json({error:{code:'NOT_FOUND',message:'Author not found.'}},404)
})
app.post('/graphql', async (c) => {
  if (!c.req.header('content-type')?.toLowerCase().startsWith('application/json')) return c.json({errors:[{message:'Use application/json.'}]},415)
  let payload: unknown
  try {payload = await c.req.json()} catch {return c.json({errors:[{message:'Invalid JSON.'}]},400)}
  const parsed = z.object({query:z.string().min(1).max(8192), variables:z.record(z.string(),z.unknown()).optional(), operationName:z.string().optional()}).safeParse(payload)
  if (!parsed.success) return c.json({errors:[{message:'Provide query (max 8192 chars), optional variables and operationName.'}]},400)
  try {
    const {query,variables,operationName} = parsed.data
    const result = await runGraphQL(query,variables,operationName,new URL(c.req.url).origin)
    return c.json(result,result.data === undefined && result.errors ? 400 : 200)
  } catch (error) {return c.json({errors:[{message: error instanceof Error ? error.message : 'Invalid query.'}]},400)}
})
// Only known static paths fall through to assets. API typos always return JSON.
app.get('/', (c) => c.env.ASSETS.fetch(c.req.raw))
app.get('/index.html', (c) => c.env.ASSETS.fetch(c.req.raw))
app.get('/app.js', (c) => c.env.ASSETS.fetch(c.req.raw))
app.get('/style.css', (c) => c.env.ASSETS.fetch(c.req.raw))
app.get('/images/*', (c) => c.env.ASSETS.fetch(c.req.raw))
app.notFound((c) => c.json({error:{code:'NOT_FOUND',message:'Endpoint not found.'}},404))
app.onError((error,c) => {
  if (error instanceof z.ZodError) return c.json({error:{code:'INVALID_PARAMETER',message:'Invalid query parameter.',details:error.issues.map((i) => ({path:i.path,message:i.message}))}},400)
  console.error(error)
  return c.json({error:{code:'INTERNAL_ERROR',message:'Internal server error.'}},500)
})
export default app
