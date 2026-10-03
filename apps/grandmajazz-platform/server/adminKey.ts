import { readFileSync } from "node:fs";
import path from "node:path";

export function readAdminKeyFile(file = path.resolve(".admin-key")): string | undefined {
  try { return readFileSync(file, "utf8").trim(); }
  catch (error: any) { if (error.code === "ENOENT") return undefined; throw error; }
}
