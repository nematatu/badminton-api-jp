import { expect, it } from 'vitest'
import { contentSchema } from '../src/data'
import { prefectureSchema } from '../src/prefectures'
import venueData from '../content/venues.json'
import authorData from '../content/authors.json'

function fixture() {
  return structuredClone({ venues: [venueData[0]], authors: authorData })
}

it('accepts all 47 prefectures and the shipped dataset', () => {
  expect(prefectureSchema.options).toHaveLength(47)
  expect(contentSchema.safeParse({ venues: venueData, authors: authorData }).success).toBe(true)
})

it.each([
  ['prefecture', 'Tokyo'], ['name', '   '], ['city', ''], ['courtCount', 0],
] as const)('rejects invalid venue field %s', (field, value) => {
  const data = fixture()
  expect(contentSchema.safeParse({ ...data, venues: [{ ...data.venues[0], [field]: value }] }).success).toBe(false)
})

it.each(['2026-02-30', '9999-12-31'])('rejects invalid/future confirmation date %s', (date) => {
  const data = fixture()
  data.venues[0].sources[0].checkedAt = date
  expect(contentSchema.safeParse(data).success).toBe(false)
})

it.each(['venues', 'authors'] as const)('identifies duplicate %s IDs', (key) => {
  const data = fixture()
  if (key === 'venues') data.venues.push(data.venues[0])
  else data.authors.push(data.authors[0])
  const result = contentSchema.safeParse(data)
  expect(result.success).toBe(false)
  if (!result.success) expect(result.error.issues[0].path).toEqual([key, 1, 'id'])
})

it('accepts a credited photo and identifies an unknown photographer', () => {
  const data = fixture()
  const photo = { name: 'court.jpg', url: 'https://example.com/court.jpg', width: 1200, height: 800, authorId: data.authors[0].id, license: 'CC-BY-4.0' }
  const input = { ...data, venues: [{ ...data.venues[0], photos: [photo] }] }
  expect(contentSchema.safeParse(input).success).toBe(true)
  photo.authorId = 'missing-author'
  const result = contentSchema.safeParse(input)
  expect(result.success).toBe(false)
  if (!result.success) expect(result.error.issues[0].path).toEqual(['venues', 0, 'photos', 0, 'authorId'])
})
