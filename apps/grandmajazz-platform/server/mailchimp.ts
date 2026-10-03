import mailchimp from "@mailchimp/mailchimp_marketing";
import { createHash } from "crypto";

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

  try {
    const response = await mailchimp.lists.addListMember(config.audienceId, {
      email_address: email,
      status: "subscribed",
      merge_fields: {
        FNAME: name,
        TITLE: title,
      },
      tags: ["family-member", "wall-signup"],
    });

    console.log(`Added ${email} to Mailchimp list`);
    return { success: true };
  } catch (error: any) {
    if (error.response?.body?.title === "Member Exists") {
      console.log(`${email} already exists in list, updating tags`);
      try {
        const config = getConfig();
        const subscriberHash = createHash("md5")
          .update(email.toLowerCase())
          .digest("hex");

        await mailchimp.lists.updateListMemberTags(
          config.audienceId!,
          subscriberHash,
          {
            tags: [
              { name: "family-member", status: "active" },
              { name: "wall-signup", status: "active" },
            ],
          }
        );
        return { success: true };
      } catch (updateError: any) {
        console.error("Error updating member tags:", updateError.response?.body || updateError);
        return { success: false, error: "Failed to update existing member" };
      }
    }

    console.error("Error adding subscriber:", error.response?.body || error);
    return { success: false, error: error.response?.body?.detail || "Failed to add subscriber" };
  }
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
