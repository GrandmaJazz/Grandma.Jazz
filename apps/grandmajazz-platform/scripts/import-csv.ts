import { readFileSync } from "fs";
import { db } from "../server/db";
import { familyMembers } from "../shared/schema";

async function importCSV() {
  const csvPath = "attached_assets/subscribed_email_audience_export_ff122e42bf_1766651047036.csv";
  const content = readFileSync(csvPath, "utf-8");
  const lines = content.split("\n").slice(1).filter(line => line.trim());

  console.log(`Found ${lines.length} records to import`);

  let imported = 0;
  let errors = 0;

  for (const line of lines) {
    try {
      const match = line.match(/^"?([^",]+)"?,([^,]+),([^,]+),/);
      if (!match) {
        const simpleMatch = line.match(/^([^,]+),([^,]+),([^,]+),/);
        if (simpleMatch) {
          const [, email, title, name] = simpleMatch;
          const cleanEmail = email.replace(/^"|"$/g, '').trim();
          const cleanTitle = title.replace(/^"|"$/g, '').trim();
          const cleanName = name.replace(/^"|"$/g, '').trim();

          if (cleanEmail && cleanTitle && cleanName) {
            const encodedEmail = Buffer.from(cleanEmail).toString("base64");
            await db.insert(familyMembers).values({
              title: cleanTitle,
              name: cleanName,
              email: encodedEmail,
              mailchimpAdded: true,
            });
            imported++;
          }
        }
        continue;
      }

      const [, email, title, name] = match;
      const cleanEmail = email.replace(/^"|"$/g, '').trim();
      const cleanTitle = title.replace(/^"|"$/g, '').trim();
      const cleanName = name.replace(/^"|"$/g, '').trim();

      if (cleanEmail && cleanTitle && cleanName) {
        const encodedEmail = Buffer.from(cleanEmail).toString("base64");
        await db.insert(familyMembers).values({
          title: cleanTitle,
          name: cleanName,
          email: encodedEmail,
          mailchimpAdded: true,
        });
        imported++;
      }
    } catch (err: any) {
      errors++;
      console.error(`Error on line: ${line.substring(0, 50)}...`, err.message);
    }
  }

  console.log(`Imported ${imported} records, ${errors} errors`);
  process.exit(0);
}

importCSV().catch(console.error);
