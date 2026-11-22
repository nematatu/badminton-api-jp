import type { ApiErrorBody, Author, Venue, VenuePage } from './types'
export type { ApiErrorBody, Author, Venue, VenuePage } from './types'

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly body: ApiErrorBody) {
    super(body.error)
    this.name = 'ApiError'
  }
}

export type VenueQuery = { page?: number; perPage?: number; prefecture?: string; q?: string }
export type RequestOptions = { signal?: AbortSignal }

/** Supply the root URL of a local or deployed Worker. No API key is needed. */
export function createClient(baseUrl: string, fetcher: typeof fetch = fetch) {
  const base = new URL(baseUrl.endsWith('/') ? baseUrl : baseUrl + '/')
  if (!['http:', 'https:'].includes(base.protocol)) throw new Error('Use an HTTP or HTTPS API URL.')

  async function get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await fetcher(new URL(path, base), { headers: { Accept: 'application/json' }, signal: options.signal })
    const body = await response.json()
    if (!response.ok) throw new ApiError(response.status, body as ApiErrorBody)
    return body as T
  }

  return {
    listVenues(query: VenueQuery = {}, options?: RequestOptions) {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(query)) if (value !== undefined) params.set(key, String(value))
      return get<VenuePage>('venues?' + params, options)
    },
    getVenue(id: string, options?: RequestOptions) {
      return get<{ venue: Venue }>('venues/' + encodeURIComponent(id), options)
    },
    getAuthor(id: string, options?: RequestOptions) {
      return get<{ author: Author }>('authors/' + encodeURIComponent(id), options)
    },
  }
}
