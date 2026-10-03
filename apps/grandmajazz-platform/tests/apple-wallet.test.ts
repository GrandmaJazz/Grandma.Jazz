import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { EventRow, Ticket, Venue } from "../shared/events-schema";

/**
 * Apple Wallet adapter fixture test. Uses a throwaway self-signed CA + signer
 * certificate generated at test time (never committed). The signature is not
 * trusted by Apple, but this proves the adapter produces a structurally valid,
 * signed .pkpass (zip with pass.json, manifest.json, signature, brand assets)
 * once real portal credentials are installed.
 */
describe("apple wallet pass generation (self-signed fixtures)", () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "gj-wallet-"));
    const ossl = (args: string[]) => execFileSync("openssl", args, { cwd: dir, stdio: "pipe" });
    // fake WWDR CA
    ossl(["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", "ca.key", "-out", "ca.pem",
      "-days", "2", "-subj", "/CN=Fake WWDR/O=Test/C=US"]);
    // signer key + csr + cert signed by fake CA
    ossl(["req", "-new", "-newkey", "rsa:2048", "-nodes", "-keyout", "signer.key", "-out", "signer.csr",
      "-subj", "/CN=Fake Pass Signer/O=Test/C=US"]);
    ossl(["x509", "-req", "-in", "signer.csr", "-CA", "ca.pem", "-CAkey", "ca.key",
      "-CAcreateserial", "-out", "signer.pem", "-days", "2"]);

    process.env.APPLE_WALLET_ENABLED = "true";
    process.env.APPLE_PASS_TYPE_ID = "pass.store.grandmajazz.events";
    process.env.APPLE_TEAM_ID = "TESTTEAM01";
    process.env.APPLE_PASS_CERT_PATH = path.join(dir, "signer.pem");
    process.env.APPLE_PASS_KEY_PATH = path.join(dir, "signer.key");
    process.env.APPLE_WWDR_CERT_PATH = path.join(dir, "ca.pem");
    process.env.APPLE_WALLET_ASSET_DIR = path.resolve("server/events/wallet/apple-assets");
  });

  it("builds a signed .pkpass with correct structure and branded fields", async () => {
    // dynamic imports so the env above is read at config load
    const { generateApplePass, appleWalletAvailable } = await import("../server/events/wallet/apple");
    expect(appleWalletAvailable()).toBe(true);

    const event = {
      id: "e-1", slug: "fixture-night", title: "Fixture Night",
      startsAt: new Date("2027-02-01T12:00:00Z"), endsAt: new Date("2027-02-01T16:00:00Z"),
      timezone: "Asia/Bangkok", minAge: 20, status: "published",
    } as unknown as EventRow;
    const venue = { name: "Grandma Jazz", latitude: "7.99", longitude: "98.29" } as unknown as Venue;
    const ticket = { id: "11111111-2222-3333-4444-555555555555", reference: "GJ-TEST-PASS", status: "valid" } as unknown as Ticket;

    const buf = await generateApplePass({
      event, venue, ticket,
      attendeeName: "Ana Fixture",
      qrContent: "https://grandmajazz.com/events/t/opaquetokenvalue",
    });

    // .pkpass is a zip
    expect(buf.subarray(0, 2).toString()).toBe("PK");

    const zipDir = mkdtempSync(path.join(os.tmpdir(), "gj-pass-"));
    writeFileSync(path.join(zipDir, "pass.pkpass"), buf);
    execFileSync("unzip", ["-o", "pass.pkpass"], { cwd: zipDir, stdio: "pipe" });
    const list = execFileSync("ls", [zipDir]).toString();
    for (const required of ["pass.json", "manifest.json", "signature", "icon.png", "logo.png"]) {
      expect(list).toContain(required);
    }
    const passJson = JSON.parse(execFileSync("cat", [path.join(zipDir, "pass.json")]).toString());
    expect(passJson.passTypeIdentifier).toBe("pass.store.grandmajazz.events");
    expect(passJson.teamIdentifier).toBe("TESTTEAM01");
    expect(passJson.serialNumber).toBe(ticket.id);
    expect(passJson.backgroundColor).toBe("rgb(0,0,0)");
    expect(passJson.eventTicket).toBeTruthy();
    expect(passJson.barcodes[0].message).toBe("https://grandmajazz.com/events/t/opaquetokenvalue");
    const fields = JSON.stringify(passJson.eventTicket);
    expect(fields).toContain("Fixture Night");
    expect(fields).toContain("Ana Fixture");
    expect(fields).toContain("GJ-TEST-PASS");
    // no raw PII beyond attendee display name; no email/phone anywhere
    expect(passJson.eventTicket.backFields.find((f: any) => f.key === "message")).toMatchObject({
      value: "See you at Grandma Jazz.", changeMessage: "%@",
    });
    expect(passJson.eventTicket.backFields.find((f: any) => f.key === "status")).toMatchObject({
      value: "Valid ticket", changeMessage: "%@",
    });
    expect(JSON.stringify(passJson)).not.toMatch(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  });

  it("renders live status, broadcasts and cancellations on a refreshed pass", async () => {
    const { generateApplePass } = await import("../server/events/wallet/apple");
    const zipDir = mkdtempSync(path.join(os.tmpdir(), "gj-pass-update-"));
    const pass = await generateApplePass({
      event: {
        id: "e-2", slug: "quiz-session", title: "Quiz Session",
        startsAt: new Date("2026-10-03T09:20:00Z"), endsAt: new Date("2026-10-03T11:20:00Z"),
        timezone: "Asia/Bangkok", status: "cancelled",
      } as unknown as EventRow,
      venue: { name: "Grandma Jazz" } as unknown as Venue,
      ticket: { id: "11111111-2222-3333-4444-555555555556", reference: "GJ-QUIZ-TEST", status: "valid" } as unknown as Ticket,
      attendeeName: "Bradley Fixture",
      qrContent: "https://www.grandmajazz.com/events/t/fixture-token",
      dynamic: { countdownLabel: "CANCELLED", message: "The quiz has been cancelled.", checkedIn: false, cancelled: true },
    });
    writeFileSync(path.join(zipDir, "pass.pkpass"), pass);
    execFileSync("unzip", ["-o", "pass.pkpass"], { cwd: zipDir, stdio: "pipe" });
    const json = JSON.parse(execFileSync("cat", [path.join(zipDir, "pass.json")]).toString());
    expect(json.voided).toBe(true);
    expect(json.eventTicket.headerFields[0].value).toBe("CANCELLED");
    expect(json.eventTicket.backFields.find((field: any) => field.key === "message")).toMatchObject({
      value: "The quiz has been cancelled.", changeMessage: "%@",
    });
    expect(execFileSync("ls", [zipDir]).toString()).toContain("strip@2x.png");
  });
});
