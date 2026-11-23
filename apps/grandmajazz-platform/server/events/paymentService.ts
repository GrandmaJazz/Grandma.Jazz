import { randomUUID } from "node:crypto";
import { pool } from "../db";
import { enqueueQuizHostSignup } from "./quizHostNotifications";

export type PaymentMethod = "scb" | "monzo";
export type PaymentOption = { method: PaymentMethod; label: string; url?: string; amountLabel?: string; promptPayPhone?: string; bankAccount?: string; qrPayload?: string };
function approvedUrl(value: string | undefined, hosts: string[]) {
  try {
    const url = new URL(value || "");
    return url.protocol === "https:" && !url.username && !url.password && hosts.includes(url.hostname.toLowerCase()) ? url.href : null;
  } catch { return null; }
}
// Thai QR merchant-presented PromptPay mobile alias (BOT/EMVCo tag 29).
// Generate locally; no third-party QR generator receives payment details.
function tlv(tag:string,value:string) { return tag+String(value.length).padStart(2,"0")+value; }
export function promptPayPayload(phone:string, amountMinor:number):string | null {
  if (!/^0[0-9]{9}$/.test(phone) || !Number.isSafeInteger(amountMinor) || amountMinor<=0) return null;
  const account=tlv("00","A000000677010111")+tlv("01","0066"+phone.slice(1));
  const base=tlv("00","01")+tlv("01","12")+tlv("29",account)+tlv("53","764")+tlv("54",(amountMinor/100).toFixed(2))+tlv("58","TH")+"6304";
  let crc=0xffff;
  for (const char of base) {
    crc^=char.charCodeAt(0)<<8;
    for(let bit=0;bit<8;bit++) crc=((crc<<1)^((crc&0x8000)?0x1021:0))&0xffff;
  }
  return base+crc.toString(16).toUpperCase().padStart(4,"0");
}
export function paymentOptions(slug: string, amount: number | null): PaymentOption[] {
  if (slug !== "ferry-christmas" || amount !== 200000) return [];
  const options: PaymentOption[] = [];
  const phone=(process.env.EVENTS_FERRY_SCB_PROMPTPAY_PHONE||"").trim();
  const account=(process.env.EVENTS_FERRY_SCB_ACCOUNT||"").trim();
  const bankAccount=/^[0-9]{3}-[0-9]{6}-[0-9]$/.test(account) ? account : undefined;
  const qrPayload=promptPayPayload(phone,amount);
  const monzo=approvedUrl(process.env.EVENTS_FERRY_MONZO_URL,["monzo.me","monzo.com","www.monzo.com"]);
  const gbp=Number(process.env.EVENTS_FERRY_MONZO_GBP_MINOR);
  if(qrPayload||bankAccount) options.push({method:"scb",label:"SCB PromptPay / bank transfer",amountLabel:"฿2,000",promptPayPhone:qrPayload?phone:undefined,bankAccount,qrPayload:qrPayload||undefined});
  if(monzo) options.push({method:"monzo",label:"Monzo",url:monzo,amountLabel:Number.isSafeInteger(gbp)&&gbp>0?`£${(gbp/100).toFixed(2)}`:"Agree the GBP equivalent with AC before paying"});
  return options;
}

type PaymentUpdate = { registrationId:string; businessId:string; method:unknown; reference:unknown; verified:boolean };
/** Guest reports are not proof of payment. Only an authenticated manager may confirm after reconciling the provider transaction. */
export async function updateEventPayment(input: PaymentUpdate): Promise<{ ok:true } | { ok:false;reason:string }> {
  if (!["scb","monzo"].includes(String(input.method)) || typeof input.reference !== "string" ||
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
