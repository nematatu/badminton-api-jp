import { z } from 'zod'
import { authorSchema, venueSchema } from './data'

export const venuePageSchema = z.object({
  venues: z.array(venueSchema),
  totalCount: z.number().int().nonnegative(),
  pageInfo: z.object({
    currentPage: z.number().int().positive(), perPage: z.number().int().min(1).max(100),
    lastPage: z.number().int().positive(),
    prevPage: z.number().int().positive().nullable(), nextPage: z.number().int().positive().nullable(),
  }),
})
export const errorSchema = z.object({
  code: z.enum(['INVALID_QUERY', 'NOT_FOUND', 'METHOD_NOT_ALLOWED', 'INTERNAL_ERROR']),
  error: z.string(),
  details: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
})
export type Venue = z.infer<typeof venueSchema>
export type Author = z.infer<typeof authorSchema>
export type VenuePage = z.infer<typeof venuePageSchema>
export type ApiErrorBody = z.infer<typeof errorSchema>
