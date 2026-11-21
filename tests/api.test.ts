import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import app from '../src/index'
import { venues, authors, venueSchema } from '../src/data'
const request = (path: string, init?: RequestInit) => app.request('https://badminton.example' + path,init)
const gql = (query: string, variables?: Record<string,unknown>) => request('/graphql',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,variables})})
describe('REST contract', () => {
 it('returns stable paging, origin-relative assets, source provenance and no invented photos',async () => {
  const res = await request('/venues?perPage=2&page=1&pretty')
  expect(res.status).toBe(200)
  expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  const data=await res.json() as any
  expect(data.venues).toHaveLength(2);expect(data.totalCount).toBe(7)
  expect(data.pageInfo).toEqual({currentPage:1,perPage:2,lastPage:4,nextPage:2,prevPage:null})
  expect(data.venues[0].illustration.url).toBe('https://badminton.example/images/badminton-court.svg')
  expect(data.venues[0].photos).toEqual([])
  expect(data.venues[0].sources[0].checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  const last=await (await request('/venues?perPage=2&page=4')).json() as any
  expect(last.venues).toHaveLength(1);expect(last.pageInfo.nextPage).toBeNull()
 })
 it('combines exact prefecture and normalized search',async () => {
  const body = await (await request('/venues?' + new URLSearchParams({prefecture:'東京都',q:'東京'}))).json() as any
  expect(body.totalCount).toBe(2)
  const normalized = await (await request('/venues?q=ＫＩＴＡＹＥＬＬ')).json() as any
  expect(normalized.totalCount).toBe(2)
 })
 it.each(['page=0','page=1.5','page=abc','page=Infinity','page=100001','perPage=101','perPage=0','perPage=','q='+ 'a'.repeat(101),'prefecture='])('rejects invalid query %s',async (query) => {
  const res=await request('/venues?'+query);expect(res.status).toBe(400)
  expect((await res.json() as any).error.code).toBe('INVALID_PARAMETER')
  expect(res.headers.get('Cache-Control')).toBe('no-store')
 })
 it('handles no matches, out-of-range pages, unknown IDs and endpoint typos',async () => {
  for (const path of ['/venues?q=unknownxyz','/venues?page=999']) expect((await (await request(path)).json() as any).venues).toEqual([])
  for (const path of ['/venues/unknown','/authors/unknown','/venuse','/api/typo']) expect((await request(path)).status).toBe(404)
 })
 it('provides venue/author detail, prefectures, health and conditional requests', async () => {
  expect((await (await request('/venues/tokyo-metropolitan-main')).json() as any).venue.courtCount).toBe(16)
  expect((await (await request('/authors/badminton-api')).json() as any).author.id).toBe('badminton-api')
  expect((await (await request('/prefectures')).json() as any).prefectures).toHaveLength(5)
  expect((await (await request('/health')).json() as any).status).toBe('ok')
  const res=await request('/venues');const etag=res.headers.get('etag')!
  expect(etag).toBeTruthy();expect((await request('/venues',{headers:{'If-None-Match':etag}})).status).toBe(304)
 })
 it('allows browser GraphQL preflight',async () => {
  const res=await request('/graphql',{method:'OPTIONS',headers:{Origin:'https://example.com','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}})
  expect(res.status).toBe(204);expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
 })
 it('publishes OpenAPI with response schemas',async () => {
  const doc=await (await request('/openapi.json')).json() as any
  expect(doc.openapi).toBe('3.0.3');expect(doc.servers[0].url).toBe('https://badminton.example')
  expect(doc.components.schemas.Venue.properties.courtCount.nullable).toBe(true)
  expect(doc.paths['/venues'].get.responses['200']).toBeDefined()
 })
})
describe('GraphQL', () => {
 it('supports variables, filters, paging, details and contributors',async () => {
  const res=await gql('query($pref: String!){ venues(prefecture:$pref,perPage:1){ totalCount venues{id name illustration{kind}} pageInfo{nextPage}} venue(id:"yokohama-budokan"){courtCount} author(id:"badminton-api"){id} }',{pref:'北海道'})
  const body=await res.json() as any
  expect(body.errors).toBeUndefined();expect(body.data.venues.totalCount).toBe(2)
  expect(body.data.venues.pageInfo.nextPage).toBe(2);expect(body.data.venue.courtCount).toBe(16)
 })
 it('validates syntax, budgets, pagination and unknown fields',async () => {
  expect((await gql('{ nope }')).status).toBe(400)
  expect((await gql('{')).status).toBe(400)
  expect((await (await gql('{venues(perPage:101){totalCount}}')).json() as any).errors).toBeDefined()
  expect((await gql('{venues{...P}} fragment P on VenuePage {totalCount}')).status).toBe(400)
  expect((await gql('{'+ Array.from({length:101},(_,i)=>`a${i}: authors{id}`).join(' ') +'}')).status).toBe(400)
 })
 it('rejects malformed/oversized bodies and unsupported content types',async () => {
  expect((await request('/graphql',{method:'POST',body:'{}'})).status).toBe(415)
  expect((await request('/graphql',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'})).status).toBe(400)
  expect((await request('/graphql',{method:'POST',headers:{'Content-Type':'application/json'},body:'x'.repeat(17000)})).status).toBe(413)
 })
})
describe('content integrity', () => {
 it('has unique IDs, valid records, authors and local assets', () => {
  expect(new Set(venues.map((v)=>v.id)).size).toBe(venues.length)
  for (const venue of venues) {
   expect(venueSchema.safeParse(venue).success).toBe(true)
   for (const photo of venue.photos) {
    expect(authors.some((a)=>a.id===photo.authorId)).toBe(true)
    expect(existsSync('public'+photo.path)).toBe(true)
   }
  }
  expect(existsSync('public/images/badminton-court.svg')).toBe(true)
 })
})

describe('static routing', () => {
 it('passes root through without rewriting to index.html (avoids asset canonical redirect loops)',async () => {
  const seen: string[]=[]
  const assets={fetch:async (req: Request) => {seen.push(new URL(req.url).pathname);return new Response('<!doctype html>',{headers:{'Content-Type':'text/html'}})}} as unknown as Fetcher
  const res=await app.request('https://badminton.example/',undefined,{ASSETS:assets})
  expect(res.status).toBe(200);expect(seen).toEqual(['/'])
  expect(res.headers.get('Content-Security-Policy')).toContain("script-src 'self'")
 })
})
