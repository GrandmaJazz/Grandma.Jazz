let csrf = "";
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function api<T = unknown>(path: string, method = "GET", body?: unknown): Promise<T> {
  const form = body instanceof FormData;
  const response = await fetch(`/garments/api/${path}`, { method, cache: "no-store", headers: { "X-Garments-Csrf": csrf, ...(!form && body !== undefined ? { "Content-Type": "application/json" } : {}) }, body: body === undefined ? undefined : form ? body : JSON.stringify(body) });
  const data = await response.json().catch(() => ({ error: response.status === 413 ? "This file exceeds the upload limit." : "The server is unavailable. Please retry." }));
  if (!response.ok) throw new ApiError(response.status, data.error || "Request failed");
  if (data.csrf) csrf = data.csrf;
  return data as T;
}
