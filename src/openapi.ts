import { z } from 'zod'
import { authorSchema, venueSchema } from './data'
import { errorSchema, venuePageSchema } from './contracts'
import { querySchema } from './query'
import { version } from '../package.json'

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })
const json = (schema: object) => ({ 'application/json': { schema } })
const headers = {
  ETag: { description: 'Representation validator for conditional GET.', schema: { type: 'string' } },
  'Cache-Control': { description: 'Successful GET: public, max-age=300. Errors: no-store.', schema: { type: 'string' } },
}
const error = (description: string) => ({ description, headers, content: json(ref('Error')) })
const success = (schema: object) => ({
  '200': { description: 'Success', headers, content: json(schema) },
  '304': { description: 'Unchanged representation. No response body.', headers },
  '405': { ...error('Only GET, HEAD and OPTIONS are supported.'), headers: { ...headers, Allow: { schema: { type: 'string' } } } },
  '500': error('Unexpected server error.'),
})
const pretty = { name: 'pretty', in: 'query', description: 'Presence enables indented JSON.', schema: { type: 'string' }, allowEmptyValue: true }
const conditional = { name: 'If-None-Match', in: 'header', description: 'Previously returned ETag; a match returns 304.', schema: { type: 'string' } }
const id = { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
const schema = (value: z.ZodType) => z.toJSONSchema(value, { target: 'openapi-3.0', io: 'output' })

export function openapi(origin: string) {
  const query = schema(querySchema).properties!
  const parameters = Object.entries(query).map(([name, value]) => ({ name, in: 'query', required: false, schema: value }))
  return {
    openapi: '3.0.3',
    info: { title: 'Badminton API Japan', version, description: '国内バドミントン会場の学習・試作用API。認証不要。データの出典・利用条件はREADMEを参照。' },
    servers: [{ url: origin }],
    security: [],
    externalDocs: { url: 'https://github.com/nematatu/badminton-api-jp#readme' },
    paths: {
      '/': { get: { operationId: 'getApiInfo', summary: 'API information', responses: success({ type: 'object', properties: { name: { type: 'string' }, version: { type: 'string' }, venueCount: { type: 'integer' }, baseUrl: { type: 'string' }, openapi: { type: 'string' }, docs: { type: 'string' }, endpoints: { type: 'array', items: { type: 'string' } } } }) } },
      '/venues': { get: { operationId: 'listVenues', summary: 'List, search and paginate venues', description: 'Parameters may only appear once. Pagination accepts decimal digits only. Unknown query keys are ignored. Search is NFKC-normalized and case-insensitive.', parameters: [...parameters, pretty, conditional], responses: { ...success(ref('VenuePage')), '400': error('Invalid or repeated query parameter.') } } },
      '/venues/{id}': { get: { operationId: 'getVenue', summary: 'Venue detail', parameters: [id, pretty, conditional], responses: { ...success({ type: 'object', required: ['venue'], properties: { venue: ref('Venue') } }), '404': error('Venue not found.') } } },
      '/authors/{id}': { get: { operationId: 'getAuthor', summary: 'Contributor detail', parameters: [id, pretty, conditional], responses: { ...success({ type: 'object', required: ['author'], properties: { author: ref('Author') } }), '404': error('Author not found.') } } },
      '/openapi.json': { get: { operationId: 'getOpenApi', summary: 'This OpenAPI specification', responses: success({ type: 'object', additionalProperties: true }) } },
    },
    components: { schemas: { Venue: schema(venueSchema), Author: schema(authorSchema), VenuePage: schema(venuePageSchema), Error: schema(errorSchema) } },
  }
}
