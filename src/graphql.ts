import { buildSchema, graphql, parse, visit } from 'graphql'
import { authors, venues, serializeVenue, listVenues } from './data'
import { z } from 'zod'
export const paginationSchema = z.object({
  page: z.number().int().min(1).max(100000).default(1),
  perPage: z.number().int().min(1).max(100).default(10),
  prefecture: z.string().min(1).max(20).optional(), q: z.string().max(100).optional(),
})
const schema = buildSchema(`
  type Source { title: String!, url: String!, checkedAt: String! }
  type Photo { name: String!, url: String!, width: Int!, height: Int!, authorId: String!, license: String! }
  type Illustration { id: ID!, url: String!, width: Int!, height: Int!, kind: String!, authorId: String!, license: String!, alt: String! }
  type Venue { id: ID!, name: String!, prefecture: String!, city: String!, courtCount: Int, officialUrl: String!, sources: [Source!]!, photos: [Photo!]!, illustration: Illustration!, notes: String! }
  type Author { id: ID!, name: String!, url: String! }
  type PageInfo { currentPage: Int!, perPage: Int!, lastPage: Int!, nextPage: Int, prevPage: Int }
  type VenuePage { venues: [Venue!]!, totalCount: Int!, pageInfo: PageInfo! }
  type Query {
    venues(page: Int = 1, perPage: Int = 10, prefecture: String, q: String): VenuePage!
    venue(id: ID!): Venue
    authors: [Author!]!
    author(id: ID!): Author
  }
`)
export async function runGraphQL(query: string, variables: Record<string, unknown> | undefined, operationName: string | undefined, origin: string) {
  let depth = 0, fields = 0, exceeded = false
  const document = parse(query)
  // Fragment spreads could expand a small document exponentially; keep this learning API bounded.
  visit(document, {
    SelectionSet: {enter() {if (++depth > 10) exceeded = true}, leave() {depth--}},
    Field() {if (++fields > 100) exceeded = true},
    FragmentSpread() {exceeded = true},
  })
  if (exceeded) throw new Error('Use at most 100 fields, depth 10, and inline fragments only.')
  return graphql({schema, source: query, variableValues: variables, operationName,
    rootValue: {
      venues: (args: unknown) => listVenues(paginationSchema.parse(args), origin),
      venue: ({id}: {id: string}) => {const v = venues.find((v) => v.id === id); return v ? serializeVenue(v, origin) : null},
      authors: () => authors,
      author: ({id}: {id: string}) => authors.find((a) => a.id === id) ?? null,
    }})
}
