/**
 * Idempotent first-platform-admin bootstrap. No hardcoded passwords: prints a
 * one-time password-set link (2h validity) for the given email.
 *
 * Usage:
 *   DATABASE_URL=... npm run events:create-admin -- admin@example.com "Admin Name"
 *   (or set EVENTS_FIRST_ADMIN_EMAIL / EVENTS_FIRST_ADMIN_NAME)
 */
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { businessMemberships, businesses, oneTimeTokens, users } from "../shared/events-schema";
import { generateOneTimeToken } from "../server/events/security";

async function main() {
  const email = (process.argv[2] || process.env.EVENTS_FIRST_ADMIN_EMAIL || "").trim().toLowerCase();
  const name = process.argv[3] || process.env.EVENTS_FIRST_ADMIN_NAME || "Platform Admin";
  if (!email.includes("@")) {
    console.error("Usage: npm run events:create-admin -- <email> [name]");
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool);

  let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (user) {
    if (!user.isPlatformAdmin) {
      await db.update(users).set({ isPlatformAdmin: true, updatedAt: new Date() }).where(eq(users.id, user.id));
      console.log(`Promoted existing user ${email} to platform admin.`);
    } else {
      console.log(`${email} is already a platform admin.`);
    }
  } else {
    [user] = await db.insert(users).values({ email, name, isPlatformAdmin: true, status: "invited" }).returning();
    console.log(`Created platform admin user ${email}.`);
  }

  // Launch tenant bootstrap: make the first admin the business owner of the
  // seeded Grandma Jazz tenant so the single-tenant launch needs no extra step.
  const [gj] = await db.select({ id: businesses.id }).from(businesses)
    .where(eq(businesses.slug, "grandma-jazz")).limit(1);
  if (gj) {
    const [existing] = await db.select({ id: businessMemberships.id }).from(businessMemberships)
      .where(and(eq(businessMemberships.businessId, gj.id), eq(businessMemberships.userId, user.id)))
      .limit(1);
    if (!existing) {
      await db.insert(businessMemberships).values({
        businessId: gj.id, userId: user.id, role: "business_owner", status: "active",
      });
      console.log("Attached as business_owner of the Grandma Jazz tenant.");
    } else {
      await db.update(businessMemberships).set({ status: "active", role: "business_owner", updatedAt: new Date() })
        .where(eq(businessMemberships.id, existing.id));
      console.log("Grandma Jazz membership ensured (business_owner, active).");
    }
  }

  if (!user.passwordHash) {
    const { token, hash } = generateOneTimeToken();
    await db.insert(oneTimeTokens).values({
      userId: user.id,
      purpose: "password_reset",
      tokenHash: hash,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    });
    const base = (process.env.PUBLIC_URL || "http://127.0.0.1:3013").replace(/\/+$/, "");
    console.log("\nOne-time password-set link (valid 2 hours, single use):");
    console.log(`  ${base}/events/manage/reset-password?token=${token}\n`);
  } else {
    console.log("User already has a password; use the normal forgot-password flow if needed.");
  }
  await pool.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
