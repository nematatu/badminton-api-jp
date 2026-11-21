import { z } from 'zod'
import venueData from '../content/venues.json'
import authorData from '../content/authors.json'
const httpsUrl = z.url().refine((v) => new URL(v).protocol === 'https:', 'HTTPS required')
const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
export const photoSchema = z.object({
  name: z.string().min(1), path: z.string().regex(/^\/images\/[a-z0-9/-]+\.(jpg|jpeg|png|webp)$/),
  width: z.number().int().positive(), height: z.number().int().positive(),
  authorId: id, license: z.literal('CC-BY-4.0'),
}).strict()
export const venueSchema = z.object({
  id, name: z.string().min(1), prefecture: z.string().min(1), city: z.string().min(1),
  courtCount: z.number().int().positive().nullable(), officialUrl: httpsUrl,
  sources: z.array(z.object({title: z.string().min(1), url: httpsUrl, checkedAt: z.iso.date()}).strict()).min(1),
  photos: z.array(photoSchema), illustrationId: z.literal('badminton-court'), notes: z.string(),
}).strict()
export const authors = z.array(z.object({id, name: z.string().min(1), url: httpsUrl}).strict()).parse(authorData)
export const venues = z.array(venueSchema).parse(venueData).sort((a,b) => a.id.localeCompare(b.id))
for (const collection of [venues, authors]) {
  if (new Set(collection.map((v) => v.id)).size !== collection.length) throw new Error('Duplicate ID')
}
for (const venue of venues) for (const photo of venue.photos) {
  if (!authors.some((a) => a.id === photo.authorId)) throw new Error(`Unknown author ${photo.authorId}`)
}
export type Venue = z.infer<typeof venueSchema>
export function serializeVenue(venue: Venue, origin: string) {
  return {...venue, photos: venue.photos.map(({path, ...photo}) => ({...photo, url: origin + path})),
    illustration: {id: venue.illustrationId, url: origin + '/images/badminton-court.svg', width: 1000, height: 640,
      kind: 'illustration', authorId: 'badminton-api', license: 'CC0-1.0', alt: '汎用のバドミントンコート図。会場の写真・配置図ではありません。'}}
}
export function listVenues(options: {page: number; perPage: number; prefecture?: string; q?: string}, origin: string) {
  const query = options.q?.normalize('NFKC').toLocaleLowerCase('ja')
  const filtered = venues.filter((v) => (!options.prefecture || v.prefecture === options.prefecture)
    && (!query || [v.name,v.prefecture,v.city,v.id].some((s) => s.normalize('NFKC').toLocaleLowerCase('ja').includes(query))))
  const {page, perPage} = options
  const lastPage = Math.max(1, Math.ceil(filtered.length / perPage))
  return {venues: filtered.slice((page-1)*perPage,page*perPage).map((v) => serializeVenue(v,origin)), totalCount: filtered.length,
    pageInfo: {currentPage: page, perPage, lastPage, prevPage: page > 1 ? Math.min(page-1,lastPage) : null, nextPage: page < lastPage ? page+1 : null}}
}
