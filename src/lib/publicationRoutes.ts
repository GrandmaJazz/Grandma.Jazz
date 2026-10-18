/** Public reader URLs only; staff, asset and API routes use their own rewrites. */
export function garmentsRoute(path: string[] = []) {
  if (path.length === 0) return { archive: false, slug: null, canonical: '/garments/' };
  if (path[0] === 'archive' && path.length === 1) return { archive: true, slug: null, canonical: '/garments/archive/' };
  const slug = path[0] === 'archive' && path.length === 2 ? path[1] : path.length === 1 ? path[0] : null;
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug) || ['manage', 'api', 'brand', 'paper', 'materials', 'media', 'archive'].includes(slug)) return null;
  // An archived edition remains the same publication when opened from Archive.
  return { archive: path[0] === 'archive', slug, canonical: `/garments/${encodeURIComponent(slug)}/` };
}

export function eventRoute(path: string[]) {
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(path[0] || '') || path.length > 2 || (path.length === 2 && path[1] !== 'register')) return null;
  return { slug: path[0], registration: path.length === 2, canonical: `/events/${encodeURIComponent(path[0])}/` };
}
