import mailchimp from "@mailchimp/mailchimp_marketing";
import { createHash } from "crypto";
import { pool } from "./db";
import { admitFamilySubscriber, contactAdmissionLimit } from "./mailchimpAdmission";

let isConfigured = false;

function getConfig() {
  return {
    apiKey: process.env.MAILCHIMP_API_KEY,
    serverPrefix: process.env.MAILCHIMP_SERVER_PREFIX,
    audienceId: process.env.MAILCHIMP_AUDIENCE_ID,
  };
}

export function initMailchimp() {
  const config = getConfig();

  if (!config.apiKey || !config.serverPrefix) {
    console.warn("Mailchimp not configured: Missing API key or server prefix");
    return false;
  }

  mailchimp.setConfig({
    apiKey: config.apiKey,
    server: config.serverPrefix,
  });
  mailchimp.timeout = 10_000;

  isConfigured = true;
  console.log("Mailchimp configured successfully");
  return true;
}

export function decodeBase64Email(encodedEmail: string): string {
  return Buffer.from(encodedEmail, "base64").toString("utf-8");
}

export async function addSubscriberToList(
  email: string,
  title: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  const config = getConfig();

  if (!isConfigured) {
    initMailchimp();
  }

  if (!isConfigured || !config.audienceId) {
    console.warn("Mailchimp not configured, skipping subscriber addition");
    return { success: false, error: "Mailchimp not configured" };
  }

  const audienceId = config.audienceId;
  const normalizedEmail = email.trim().toLowerCase();
  const subscriberHash = createHash("md5").update(normalizedEmail).digest("hex");
  return admitFamilySubscriber(contactAdmissionLimit(process.env.MAILCHIMP_CONTACT_CAP), {
    async withLock(work) {
      const connection = await pool.connect();
      try {
        await connection.query("BEGIN");
        await connection.query("SET LOCAL lock_timeout = '5s'");
        // All application replicas and the admin push path share this lock.
        await connection.query("SELECT pg_advisory_xact_lock($1)", [714500495]);
        const result = await work();
        await connection.query("COMMIT");
        return result;
      } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
      } finally {
        connection.release();
      }
    },
    async findMember() {
      try {
        return await mailchimp.lists.getListMember(audienceId, subscriberHash, {
          fields: ["status", "tags.name"],
        });
      } catch (error: any) {
        if (error.status === 404 || error.response?.status === 404) return null;
        throw error;
      }
    },
    async countBillableContacts() {
      const response = await mailchimp.lists.getAllLists({ count: 1000, fields: ["lists.id", "total_items"] });
      if (!Array.isArray(response.lists) || response.lists.length !== response.total_items ||
          !response.lists.some(audience => audience.id === audienceId)) {
        throw new Error("Incomplete audience count");
      }
      let total = 0;
      // Count the three billable email statuses across every audience. Do not
      // use list.stats: Mailchimp documents those values as cached/approximate.
      for (const audience of response.lists) {
        for (const status of ["subscribed", "unsubscribed", "transactional"] as const) {
          const page = await mailchimp.lists.getListMembersInfo(audience.id, {
            count: 1, status, fields: ["total_items"],
          });
          if (!Number.isSafeInteger(page.total_items) || page.total_items < 0) {
            throw new Error("Invalid audience count");
          }
          total += page.total_items;
        }
      }
      return total;
    },
    async createMember() {
      await mailchimp.lists.addListMember(audienceId, {
        email_address: normalizedEmail,
        status: "subscribed",
        merge_fields: {
          FNAME: name.trim(),
          MMERGE5: `${title.trim()} ${name.trim()}`,
          MMERGE6: title.trim(),
        },
        tags: ["family-member", "wall-signup"],
      });
    },
  });
}

export async function triggerWelcomeAutomation(email: string): Promise<boolean> {
  if (!isConfigured) {
    console.warn("Mailchimp not configured, skipping welcome automation");
    return false;
  }

  console.log(`Subscriber ${email} added - welcome email will be sent via Mailchimp automation`);
  return true;
}

export async function pingMailchimp(): Promise<boolean> {
  if (!isConfigured) {
    initMailchimp();
  }

  if (!isConfigured) {
    return false;
  }

  try {
    const response = await mailchimp.ping.get();
    console.log("Mailchimp ping:", response);
    return true;
  } catch (error) {
    console.error("Mailchimp ping failed:", error);
    return false;
  }
}

export async function getMailchimpConnectionStatus(): Promise<{
  configured: boolean;
  ping: boolean;
  audienceConfigured: boolean;
  audienceReachable: boolean;
  audienceName: string | null;
  error: string | null;
}> {
  const config = getConfig();
  if (!isConfigured) {
    initMailchimp();
  }

  const configured = Boolean(isConfigured && config.apiKey && config.serverPrefix);
  const audienceConfigured = Boolean(config.audienceId);
  if (!configured) {
    return {
      configured: false,
      ping: false,
      audienceConfigured,
      audienceReachable: false,
      audienceName: null,
      error: "Mailchimp API key or server prefix is missing",
    };
  }

  try {
    await mailchimp.ping.get();
    let audienceName: string | null = null;
    let audienceReachable = false;

    if (config.audienceId) {
      const list = await (mailchimp as any).lists.getList(config.audienceId);
      audienceName = typeof list?.name === "string" ? list.name : null;
      audienceReachable = true;
    }

    return {
      configured,
      ping: true,
      audienceConfigured,
      audienceReachable,
      audienceName,
      error: null,
    };
  } catch (error: any) {
    return {
      configured,
      ping: false,
      audienceConfigured,
      audienceReachable: false,
      audienceName: null,
      error: error.response?.body?.detail || error.message || "Mailchimp connection failed",
    };
  }
}
