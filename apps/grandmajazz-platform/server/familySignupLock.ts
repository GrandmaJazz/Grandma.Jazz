import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "./db";
import { storage, type MemberWriteContext } from "./storage";
import type { FamilySignupStore } from "./familySignup";

export async function withFamilyMemberEmailLock<T>(
  email: string,
  work: (members: FamilySignupStore) => Promise<T>,
): Promise<T> {
  const connection = await pool.connect();
  const afterCommit: Array<() => Promise<void>> = [];
  let committed = false;
  try {
    await connection.query("BEGIN");
    await connection.query("SET LOCAL lock_timeout = '5s'");
    await connection.query("SET LOCAL statement_timeout = '10s'");
    // The two-integer advisory-lock namespace is separate from Mailchimp's
    // single-bigint capacity lock. Hash collisions only serialize extra work.
    await connection.query("SELECT pg_advisory_xact_lock($1, hashtext($2))", [714500496, email.trim().toLowerCase()]);
    const context: MemberWriteContext = {
      database: drizzle(connection),
      afterCommit: action => { afterCommit.push(action); },
    };
    const result = await work({
      findMemberByEmail: value => storage.findMemberByEmail(value, context),
      createMember: member => storage.createMember(member, context),
    });
    await connection.query("COMMIT");
    committed = true;
    let cacheRefreshFailed = false;
    for (const action of afterCommit) {
      try { await action(); }
      catch { cacheRefreshFailed = true; }
    }
    // The member is durable now. A rebuildable cache failure must not turn a
    // successful signup into an error before its consent/admission can run.
    if (cacheRefreshFailed) console.warn("[Family] Member saved; member cache refresh failed and will be rebuilt from the database.");
    return result;
  } catch (error) {
    if (!committed) await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }
}
