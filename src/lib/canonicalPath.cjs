/** Keep page URLs canonical without redirecting authenticated API calls. */
function needsPageSlash(path) {
  return !path.endsWith('/') && !/\.[^/]+$/.test(path)
    && !['/api/', '/events/api/', '/garments/api/', '/_next/', '/.well-known/'].some(prefix => path.startsWith(prefix));
}
module.exports = { needsPageSlash };
