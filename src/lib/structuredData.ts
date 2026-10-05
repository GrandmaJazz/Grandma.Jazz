export const SITE_URL = 'https://www.grandmajazz.com';

// Prevent a database title or description from closing the JSON-LD script tag.
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
