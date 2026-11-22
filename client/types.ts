export interface Source { title: string; url: string; checkedAt: string }
export interface Photo {
  name: string; url: string; width: number; height: number
  authorId: string; license: 'CC-BY-4.0'
}
export interface Venue {
  id: string; name: string; prefecture: string; city: string
  courtCount: number | null; officialUrl: string
  sources: Source[]; photos: Photo[]; notes: string
}
export interface Author { id: string; name: string; url: string }
export interface VenuePage {
  venues: Venue[]; totalCount: number
  pageInfo: {
    currentPage: number; perPage: number; lastPage: number
    prevPage: number | null; nextPage: number | null
  }
}
export interface ApiErrorBody {
  code: 'INVALID_QUERY' | 'NOT_FOUND' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR'
  error: string
  details?: { field: string; message: string }[]
}
