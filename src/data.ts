import { z } from 'zod'
import venueData from '../content/venues.json'
import authorData from '../content/authors.json'
import type { querySchema } from './query'

const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const url = z.url().refine((value) => new URL(value).protocol === 'https:', 'HTTPS required')
export const venueSchema = z.object({
  id,
  name: z.string().min(1),
  prefecture: z.string().min(1),
  city: z.string().min(1),
  courtCount: z.number().int().positive().nullable(),
  officialUrl: url,
  sources: z.array(z.object({ title: z.string().min(1), url, checkedAt: z.iso.date() }).strict()).min(1),
  photos: z.array(z.object({
    name: z.string().min(1), url,
    width: z.number().int().positive(), height: z.number().int().positive(),
    authorId: id, license: z.literal('CC-BY-4.0'),
  }).strict()),
  notes: z.string(),
}).strict()

export const authors = z.array(z.object({ id, name: z.string().min(1), url }).strict()).parse(authorData)
export const venues = z.array(venueSchema).parse(venueData).sort((a, b) => a.id.localeCompare(b.id))
for (const collection of [venues, authors]) {
  if (new Set(collection.map((v) => v.id)).size !== collection.length) throw new Error('Duplicate ID')
}
for (const venue of venues) for (const photo of venue.photos) {
  if (!authors.some((a) => a.id === photo.authorId)) throw new Error(`Unknown author ${photo.authorId}`)
}

export function listVenues({ page, perPage, prefecture, q }: z.infer<typeof querySchema>) {
  const query = q?.normalize('NFKC').toLocaleLowerCase('ja')
  const filtered = venues.filter((v) => (!prefecture || v.prefecture === prefecture)
    && (!query || [v.name, v.prefecture, v.city, v.id].some((s) => s.normalize('NFKC').toLocaleLowerCase('ja').includes(query))))
  const lastPage = Math.max(1, Math.ceil(filtered.length / perPage))
  return {
    venues: filtered.slice((page - 1) * perPage, page * perPage),
    totalCount: filtered.length,
    pageInfo: {
      currentPage: page, perPage, lastPage,
      prevPage: page > 1 ? Math.min(page - 1, lastPage) : null,
      nextPage: page < lastPage ? page + 1 : null,
    },
  }
}
