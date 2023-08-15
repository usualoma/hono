export const METHOD_NAME_ALL = 'ALL' as const
export const METHOD_NAME_ALL_LOWERCASE = 'all' as const
export const METHODS = ['get', 'post', 'put', 'delete', 'options', 'patch'] as const

export interface Router<T> {
  name: string
  add(method: string, path: string, handler: T): void
  match(method: string, path: string): Result<T> | null
  getStaticRoutes(): Record<string, Record<string, Result<T>>>
}

export interface Result<T> {
  handlers: T[]
  params: Record<string, string>,
  path?: string,
  firstQuery?: Record<string, string>,
}

export class UnsupportedPathError extends Error {}
