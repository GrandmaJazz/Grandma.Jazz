import { randomUUID } from "node:crypto";
import type { Request } from "express";
import { pool } from "./db";

export type CurrentAdmin = { email: string; name: string };

/** The existing shop API remains the authority for Grandma Jazz admin access. */
export async function verifyCurrentAdmin(req: Request): Promise<CurrentAdmin | null> {
  const match = /^Bearer\s+([^\s]+)$/i.exec(req.header("authorization") || "");
  if (!match || match[1].length > 4096) return null;

  const api = process.env.EXISTING_API_URL;
  if (!api) throw new Error("EXISTING_API_URL is not configured");

  const response = await fetch(new URL("/api/auth/profile", api).toString(), {
    headers: { Authorization: `Bearer ${match[1]}` },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error(`Current admin API returned ${response.status}`);

  const data = await response.json();
  const user = data?.user;
  if (user?.isAdmin !== true || typeof user.email !== "string") return null;
  const email = user.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const name = [user.name, user.surname].filter((part) => typeof part === "string").join(" ").trim();
  return { email, name: (name || email).slice(0, 160) };
}

/** Map a current shop admin to the copied platform's existing staff tables. */
export async function provisionCurrentAdmin(admin: CurrentAdmin): Promise<{ id: string; sessionEpoch: number }> {
  const result = await pool.query(
    `INSERT INTO ev_users (id,email,name,status,email_verified_at)
     VALUES ($1,$2,$3,'active',now())
     ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name,status='active',
       email_verified_at=COALESCE(ev_users.email_verified_at,now()),updated_at=now()
     RETURNING id,session_epoch`,
    [randomUUID(), admin.email, admin.name],
  );
  return { id: result.rows[0].id, sessionEpoch: result.rows[0].session_epoch };
}
