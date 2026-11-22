import { z } from 'zod'
import venueData from '../content/venues.json'
import authorData from '../content/authors.json'
import type { querySchema } from './query'
import { prefectureSchema } from './prefectures'

const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const text = z.string().trim().min(1)
const checkedAt = z.iso.date()
const url = z.url().refine((value) => new URL(value).protocol === 'https:', 'HTTPS required')
export const venueSchema = z.object({
  id,
  name: text,
  prefecture: prefectureSchema,
  city: text,
  courtCount: z.number().int().positive().nullable(),
  officialUrl: url,
  sources: z.array(z.object({ title: text, url, checkedAt }).strict()).min(1),
  photos: z.array(z.object({
    name: text, url,
    width: z.number().int().positive(), height: z.number().int().positive(),
    authorId: id, license: z.literal('CC-BY-4.0'),
  }).strict()),
  notes: z.string().trim(),
}).strict()

export const contentSchema = z.object({
  venues: z.array(venueSchema),
  authors: z.array(z.object({ id, name: text, url }).strict()),
}).superRefine((content, context) => {
  for (const key of ['venues', 'authors'] as const) {
    const seen = new Set<string>()
    content[key].forEach((item, index) => {
      if (seen.has(item.id)) context.addIssue({ code: 'custom', path: [key, index, 'id'], message: `Duplicate ID: ${item.id}` })
      seen.add(item.id)
    })
  }
  const authorIds = new Set(content.authors.map((a) => a.id))
  content.venues.forEach((venue, i) => venue.photos.forEach((photo, j) => {
    if (!authorIds.has(photo.authorId)) context.addIssue({
      code: 'custom', path: ['venues', i, 'photos', j, 'authorId'], message: `Unknown author: ${photo.authorId}`,
    })
  }))
})

const content = contentSchema.parse({ venues: venueData, authors: authorData })
export const authors = content.authors
export const venues = content.venues.sort((a, b) => a.id.localeCompare(b.id))

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
