import { describe, expect, expectTypeOf, it } from 'vitest'
import { ApiError, createClient } from '../client'
import type { ApiErrorBody, Author, Venue, VenuePage } from '../client'
import type * as Contract from '../src/contracts'
import app from '../src/index'

const localFetch = ((input: Parameters<typeof fetch>[0], init?: RequestInit) => app.request(new Request(String(input), init))) as typeof fetch
const api = createClient('https://badminton.example/', localFetch)

describe('TypeScript client', () => {
  it('returns filtered, paginated data with escaped Japanese query text', async () => {
    const page = await api.listVenues({ prefecture: '東京都', q: '東京', perPage: 1 })
    expect(page.venues).toHaveLength(1)
    expect(page.totalCount).toBe(2)
    expect(page.pageInfo.nextPage).toBe(2)
    const next = await api.listVenues({ prefecture: '東京都', perPage: 1, page: page.pageInfo.nextPage! })
    expect(next.venues[0].id).not.toBe(page.venues[0].id)
  })

  it('returns venue and contributor details', async () => {
    expect((await api.getVenue('tokyo-metropolitan-main')).venue.courtCount).toBe(16)
    expect((await api.getAuthor('badminton-api')).author.id).toBe('badminton-api')
  })

  it('exposes status, stable code and parameter details on errors', async () => {
    try { await api.listVenues({ page: 0 }); throw new Error('Expected API error') }
    catch (error) {
      expect(error).toBeInstanceOf(ApiError)
      if (error instanceof ApiError) {
        expect(error.status).toBe(400)
        expect(error.body.code).toBe('INVALID_QUERY')
        expect(error.body.details?.[0].field).toBe('page')
      }
    }
    await expect(api.getVenue('missing')).rejects.toMatchObject({ status: 404, body: { code: 'NOT_FOUND' } })
  })

  it('supports request cancellation without converting it to an API error', async () => {
    const controller = new AbortController()
    controller.abort()
    const client = createClient('https://badminton.example', (async (_url, options) => {
      options?.signal?.throwIfAborted()
      throw new Error('Expected an aborted signal')
    }) as typeof fetch)
    await expect(client.listVenues({}, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('keeps standalone client types compatible with response contracts', () => {
    expectTypeOf<Contract.Venue>().toMatchTypeOf<Venue>()
    expectTypeOf<Contract.Author>().toEqualTypeOf<Author>()
    expectTypeOf<Contract.VenuePage>().toMatchTypeOf<VenuePage>()
    expectTypeOf<Contract.ApiErrorBody>().toMatchTypeOf<ApiErrorBody>()
  })
})
