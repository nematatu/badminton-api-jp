import { describe, it, expect } from 'vitest'
import app from '../src/index'
import { venues, authors, venueSchema } from '../src/data'

const request = (path: string) => app.request('https://badminton.example' + path)

describe('REST API', () => {
  it('lists venues with stable paging and source provenance', async () => {
    const res = await request('/venues?perPage=2&page=1&pretty')
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    const text = await res.text()
    expect(text).toContain('\n')
    const data = JSON.parse(text)
    expect(data.venues).toHaveLength(2)
    expect(data.totalCount).toBe(7)
    expect(data.pageInfo).toEqual({ currentPage: 1, perPage: 2, lastPage: 4, nextPage: 2, prevPage: null })
    expect(data.venues[0].photos).toEqual([])
    expect(data.venues[0].sources[0].checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const last = await (await request('/venues?perPage=2&page=4')).json() as any
    expect(last.venues).toHaveLength(1)
    expect(last.pageInfo.nextPage).toBeNull()
  })

  it('combines prefecture filtering and normalized search', async () => {
    const filtered = await (await request('/venues?' + new URLSearchParams({ prefecture: '東京都', q: '東京' }))).json() as any
    expect(filtered.totalCount).toBe(2)
    const normalized = await (await request('/venues?q=ＫＩＴＡＹＥＬＬ')).json() as any
    expect(normalized.totalCount).toBe(2)
    const trimmed = await (await request('/venues?' + new URLSearchParams({ prefecture: ' 東京都 ', q: ' 東京 ' }))).json() as any
    expect(trimmed.totalCount).toBe(2)
  })

  it.each(['page=0', 'page=1.5', 'page=abc', 'page=Infinity', 'page=100001', 'page=0x10', 'page=1e2', 'page=2.0', 'page=%202', 'page=1&page=2', 'perPage=1&perPage=2', 'q=a&q=b', 'pretty&pretty', 'perPage=101', 'perPage=0', 'perPage=', 'q=' + 'a'.repeat(101), 'prefecture='])('rejects invalid query %s', async (query) => {
    const res = await request('/venues?' + query)
    expect(res.status).toBe(400)
    const body = await res.json() as any
    expect(body.error).toBe('Invalid query parameter.')
    expect(body.details[0].field).toBe(query.split('=')[0].split('&')[0])
    expect(body.details[0].message).toBeTruthy()
  })

  it('returns empty lists and JSON 404s', async () => {
    for (const path of ['/venues?q=unknownxyz', '/venues?page=999']) {
      expect((await (await request(path)).json() as any).venues).toEqual([])
    }
    for (const path of ['/venues/unknown', '/authors/unknown', '/venuse']) {
      const res = await request(path)
      expect(res.status).toBe(404)
      expect((await res.json() as any).error).toBeTruthy()
    }
  })

  it('returns venue and author details', async () => {
    expect((await (await request('/venues/tokyo-metropolitan-main')).json() as any).venue.courtCount).toBe(16)
    expect((await (await request('/authors/badminton-api')).json() as any).author.id).toBe('badminton-api')
  })
})

describe('content integrity', () => {
  it('has valid records, unique IDs and known photo authors', () => {
    expect(new Set(venues.map((v) => v.id)).size).toBe(venues.length)
    for (const venue of venues) {
      expect(venueSchema.safeParse(venue).success).toBe(true)
      for (const photo of venue.photos) expect(authors.some((a) => a.id === photo.authorId)).toBe(true)
    }
  })
})
