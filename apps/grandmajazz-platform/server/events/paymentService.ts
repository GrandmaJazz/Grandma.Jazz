import { randomUUID } from "node:crypto";
import { pool } from "../db";
import { enqueueQuizHostSignup } from "./quizHostNotifications";

export type PaymentMethod = "scb" | "stripe" | "monzo";
export type PaymentOption = { method: PaymentMethod; label: string; url: string; amountLabel?: string };
function approvedUrl(value: string | undefined, hosts: string[]) {
  try {
    const url = new URL(value || "");
    return url.protocol === "https:" && !url.username && !url.password && hosts.includes(url.hostname.toLowerCase()) ? url.href : null;
  } catch { return null; }
}
export function paymentOptions(slug: string, amount: number | null): PaymentOption[] {
  if (slug !== "ferry-christmas" || amount !== 200000) return [];
  const options: PaymentOption[] = [];
  const scb = approvedUrl(process.env.EVENTS_FERRY_SCB_QR_URL, ["www.grandmajazz.com","grandmajazz.com"]);
  const stripe = approvedUrl(process.env.EVENTS_FERRY_STRIPE_URL, ["buy.stripe.com","checkout.stripe.com"]);
  const monzo = approvedUrl(process.env.EVENTS_FERRY_MONZO_URL, ["monzo.me","monzo.com","www.monzo.com"]);
  const gbp = Number(process.env.EVENTS_FERRY_MONZO_GBP_MINOR);
  if (scb) options.push({method:"scb",label:"SCB Thai bank QR",url:scb,amountLabel:"฿2,000"});
  if (stripe) options.push({method:"stripe",label:"International card (Stripe)",url:stripe,amountLabel:"฿2,000"});
  if (monzo && Number.isSafeInteger(gbp) && gbp > 0) options.push({method:"monzo",label:"Monzo",url:monzo,amountLabel:`£${(gbp/100).toFixed(2)}`});
  return options;
}

type PaymentUpdate = { registrationId:string; businessId:string; method:unknown; reference:unknown; verified:boolean };
/** Guest reports are not proof of payment. Only an authenticated manager may confirm after reconciling the provider transaction. */
export async function updateEventPayment(input: PaymentUpdate): Promise<{ ok:true } | { ok:false;reason:string }> {
  if (!["scb","stripe","monzo"].includes(String(input.method)) || typeof input.reference !== "string" ||
      input.reference.trim().length < 3 || input.reference.trim().length > 120 || /[\r\n\x00-\x1f\x7f]/.test(input.reference)) {
    return {ok:false,reason:"Choose a payment method and enter its transaction reference."};
  }
  const method = String(input.method), reference = input.reference.trim();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows:[row] } = await client.query(`SELECT r.id,r.payment_status,r.payment_amount_minor,r.payment_method,r.payment_reference,e.slug,e.status AS event_status
      FROM ev_registrations r JOIN ev_events e ON e.id=r.event_id
      WHERE r.id=$1 AND r.business_id=$2 AND r.status='confirmed' FOR UPDATE OF e,r`,[input.registrationId,input.businessId]);
    if (!row || ["cancelled","archived","completed"].includes(row.event_status) || !["reserved","pending","confirmed"].includes(row.payment_status)) {
      await client.query("ROLLBACK"); return {ok:false,reason:"No active paid reservation was found."};
    }
    if (row.payment_status === "confirmed") {
      await client.query("ROLLBACK");
      return row.payment_method === method && row.payment_reference === reference ? {ok:true} : {ok:false,reason:"Payment has already been confirmed."};
    }
    if (!input.verified && !paymentOptions(row.slug,row.payment_amount_minor).some(option=>option.method===method)) {
      await client.query("ROLLBACK"); return {ok:false,reason:"That payment option is not available."};
    }
    if (!input.verified && row.payment_status==="pending" && row.payment_method===method && row.payment_reference===reference) {
      await client.query("COMMIT"); return {ok:true};
    }
    await client.query(`UPDATE ev_registrations SET payment_status=$2,payment_method=$3,payment_reference=$4,paid_at=CASE WHEN $2='confirmed' THEN now() ELSE NULL END,updated_at=now() WHERE id=$1`,
      [row.id,input.verified?"confirmed":"pending",method,reference]);
    if (input.verified) await client.query("UPDATE ev_tickets SET status='valid',updated_at=now() WHERE registration_id=$1 AND status='payment_pending'",[row.id]);
    await enqueueQuizHostSignup(client,row.id,input.verified?"payment_confirmed":"payment_reported",randomUUID());
    await client.query("COMMIT"); return {ok:true};
  } catch (err:any) {
    await client.query("ROLLBACK").catch(()=>{});
    if (err?.code==="23505" && String(err?.constraint||"").includes("confirmed_payment_reference")) return {ok:false,reason:"This payment reference has already been confirmed for another reservation."};
    throw err;
  } finally { client.release(); }
}
