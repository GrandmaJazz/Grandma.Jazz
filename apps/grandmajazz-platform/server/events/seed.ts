import { eq } from "drizzle-orm";
import { db } from "../db";
import { businesses } from "@shared/events-schema";

/** Idempotently ensure the launch tenant exists. */
export async function seedGrandmaJazzTenant(): Promise<string> {
  const [existing] = await db.select({ id: businesses.id }).from(businesses)
    .where(eq(businesses.slug, "grandma-jazz")).limit(1);
  if (existing) return existing.id;
  const [created] = await db.insert(businesses).values({
    name: "Grandma Jazz",
    slug: "grandma-jazz",
    contactEmail: "grandma@grandmajazz.com",
    instagramUrl: "https://www.instagram.com/grandmajazzphuket",
    websiteUrl: "https://www.grandmajazz.com",
    defaultTimezone: "Asia/Bangkok",
    theme: {
      background: "#000000",
      foreground: "#ffffff",
      border: "rgba(255,255,255,0.9)",
      radiusPx: 10,
      fontFamily: "Galvji",
    },
  }).onConflictDoNothing({ target: businesses.slug }).returning({ id: businesses.id });
  if (created) {
    console.log("[events] seeded Grandma Jazz tenant");
    return created.id;
  }
  const [row] = await db.select({ id: businesses.id }).from(businesses)
    .where(eq(businesses.slug, "grandma-jazz")).limit(1);
  return row.id;
}
