// Build a URL that respects the BASE_PATH the app was built with.
// import.meta.env.BASE_URL is provided by Vite and always ends with "/".
const BASE = import.meta.env.BASE_URL;

export function apiUrl(path: string): string {
  const clean = path.startsWith("/") ? path.slice(1) : path;
  return `${BASE}${clean}`;
}
