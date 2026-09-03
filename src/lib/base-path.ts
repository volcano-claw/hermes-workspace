export function withBasePath(path: string): string {
  const rawBase = import.meta.env.VITE_BASE_PATH as string | undefined
  const base = (rawBase || '').replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalizedPath}`
}
