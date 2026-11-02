/**
 * Resolve a public-folder path ("/memories/a.jpg") against Vite's base URL so
 * the build works both at a domain root and under a sub-path.
 */
export function assetUrl(path: string): string {
  if (/^(https?:|data:|blob:)/.test(path)) return path
  const base = import.meta.env.BASE_URL
  return base + path.replace(/^\//, '')
}
