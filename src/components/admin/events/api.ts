import { apiUrl } from "../platformUrl";

/** JSON fetch helper for the events APIs (/events/api/v1/...). */

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function eventsApiUrl(path: string): string {
  return apiUrl(`/events/api/v1${path}`);
}

export async function api<T = unknown>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, ...rest } = init;
  const res = await fetch(eventsApiUrl(path), {
    credentials: "same-origin",
    ...rest,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(rest.headers || {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const body = isJson ? await res.json().catch(() => ({})) : null;
  if (!res.ok) {
    throw new ApiError(res.status, body?.error || `Request failed (${res.status})`, body?.code);
  }
  return body as T;
}

/** Local-date and time formatting for a specific IANA timezone (12h, "4:20 PM"). */
function upperMeridiem(s: string): string {
  return s.replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
}

export function fmtDateTime(iso: string, tz: string): string {
  return upperMeridiem(new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  }).format(new Date(iso)));
}

export function fmtDate(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, weekday: "short", day: "numeric", month: "short", year: "numeric",
  }).format(new Date(iso));
}

export function fmtTime(iso: string, tz: string): string {
  return upperMeridiem(new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true,
  }).format(new Date(iso)));
}
