import { z } from 'zod'

const integer = (max: number, fallback: number) => z.string()
  .regex(/^[0-9]+$/, 'Use decimal digits only.')
  .transform(Number)
  .pipe(z.number().int().min(1).max(max))
  .default(fallback)

export const querySchema = z.object({
  page: integer(100000, 1),
  perPage: integer(100, 10),
  prefecture: z.string().trim().min(1).max(20).optional(),
  q: z.string().trim().max(100).optional(),
})

const singleValues = z.instanceof(URLSearchParams).superRefine((params, context) => {
  for (const field of [...Object.keys(querySchema.shape), 'pretty']) {
    if (params.getAll(field).length > 1) {
      context.addIssue({ code: 'custom', path: [field], message: 'Provide this parameter only once.' })
    }
  }
})

export function parseQuery(params: URLSearchParams) {
  return querySchema.parse(Object.fromEntries(singleValues.parse(params)))
}
