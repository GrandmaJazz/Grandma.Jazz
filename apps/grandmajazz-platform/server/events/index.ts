import fs from "node:fs";
import path from "node:path";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { events, venues } from "@shared/events-schema";
import { assertEventsConfig, eventsConfig } from "./config";
import { eventsSessionMiddleware } from "./session";
import { requireSameOrigin } from "./security";
import { escapeHtml } from "./content";
import { authRouter } from "./routes/authRoutes";
import { publicRouter } from "./routes/publicRoutes";
import { ticketRouter } from "./routes/ticketRoutes";
import { manageRouter } from "./routes/manageRoutes";
import { platformRouter } from "./routes/platformRoutes";
import { startOutboxWorker } from "./outboxWorker";
import { seedGrandmaJazzTenant } from "./seed";

/**
 * Mounts the whole events module on the existing Express app.
 * URL space (all beneath /events):
 *   /events, /events/{slug}, /events/{slug}/register  — public SPA pages (meta-injected)
 *   /events/t/{token}[...]                            — private ticket SPA pages
 *   /events/manage/**, /events/platform/**            — organizer/admin SPA pages
 *   /events/api/v1/**                                 — JSON APIs
 *   /events/api/health                                — module health
 *   /events/uploads/**                                — event media
 */
export async function mountEventsModule(app: Express): Promise<void> {
  assertEventsConfig();
  await seedGrandmaJazzTenant();

  const base = eventsConfig.base;
  const api = express.Router();

  // security headers for everything under /events
  app.use(base, (req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    // Staff tools are embedded by the existing same-origin Grandma Jazz admin.
    res.set("X-Frame-Options", "SAMEORIGIN");
    res.set("Referrer-Policy", "strict-origin-when-cross-origin");
    res.set("Permissions-Policy", "camera=(self), geolocation=(), microphone=()");
    next();
  });

  api.use(eventsSessionMiddleware());
  api.use(requireSameOrigin);
  api.use("/v1/auth", authRouter());
  api.use("/v1/manage", manageRouter());
  api.use("/v1/platform", platformRouter());
  api.use("/v1/t", ticketRouter());
  // Apple Wallet pass-update web service (device registrations, pass refresh);
  // authenticated per-pass via ApplePass tokens, not sessions
  const { appleWebServiceRouter, startPassRefreshWorker } = await import("./wallet/passUpdates");
  api.use("/v1/wallet/apple", appleWebServiceRouter());
  api.use("/v1", publicRouter());
  // /events/api/health alias (deployment smoke tests)
  api.get("/health", (_req, res, next) => {
    res.redirect(307, `${base}/api/v1/health`);
    void next;
  });

  app.use(`${base}/api`, api);

  // brand logo PNGs (same artwork as the wallet pass) — the true Galvji font
  // only exists server-side, so both the web header and emails use these
  const LOGO_FILES: Record<string, string> = {
    "logo.png": "logo@2x.png", // email header (rendered @2x, displayed 160x50)
    "logo-web.png": "logo-web.png", // site header (rendered @2x, displayed 190x65)
    "wallet-grandma-jazz.png": "logo-google.png", // public 1280x400 wide mark for Google Wallet
    "wallet-grandma-jazz-square.png": "logo-google-square.png", // Google-required square logo
  };
  app.get(`${base}/assets/:name`, (req, res) => {
    const mapped = LOGO_FILES[req.params.name];
    const file = mapped && path.resolve(process.cwd(), "server/events/wallet/apple-assets", mapped);
    if (!file || !fs.existsSync(file)) { res.status(404).send("Not found"); return; }
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=86400");
    res.sendFile(file);
  });

  // event media (non-executable static dir, long cache — names are content-random)
  app.use(`${base}/uploads`, express.static(eventsConfig.uploadsDir, {
    fallthrough: false,
    immutable: true,
    maxAge: "30d",
    setHeaders: (res) => res.set("X-Content-Type-Options", "nosniff"),
  }), (err: any, _req: Request, res: Response, next: NextFunction) => {
    if (err?.statusCode === 404 || err?.code === "ENOENT") res.status(404).send("Not found");
    else next(err);
  });

  // Server-injected HTML for public event pages (Open Graph / JSON-LD) and
  // noindex-hardened HTML for private pages. Only active in production where
  // the built index.html exists; dev falls through to Vite.
  app.get([`${base}/t/:token`, `${base}/t/:token/print`], (req, res, next) => {
    void servePrivateHtml(req, res, next, { referrer: "no-referrer" });
  });
  app.get([`${base}/manage`, `${base}/manage/*`, `${base}/platform`, `${base}/platform/*`], (req, res, next) => {
    void servePrivateHtml(req, res, next, {});
  });
  // Fixed admin paths must precede /events/:slug, or "manage" is treated as
  // an event slug and returns a public 404 before the editor can load.
  app.get([`${base}`, `${base}/:slug`, `${base}/:slug/register`], (req, res, next) => {
    void servePublicHtml(req, res, next);
  });

  startOutboxWorker();
  startPassRefreshWorker();
  console.log(`[events] module mounted at ${base}`);
}

// ------------------------------------------------------------- HTML serving

let indexTemplate: string | null | undefined;
function loadIndexTemplate(): string | null {
  if (indexTemplate !== undefined) return indexTemplate;
  const file = path.resolve(__dirname, "public", "index.html");
  indexTemplate = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  return indexTemplate;
}

function renderWithHead(template: string, headHtml: string, title: string): string {
  let html = template.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
  // drop the wall app's baked-in social/description meta so events pages get
  // exactly one canonical set (the template ships a replit og:image, etc.)
  html = html.replace(/^\s*<meta\s+(?:property="(?:og|twitter):[^"]*"|name="(?:twitter:[^"]*|description)")[^>]*>\s*$\n?/gm, "");
  html = html.replace("</head>", `${headHtml}\n</head>`);
  return html;
}

async function servePublicHtml(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const template = loadIndexTemplate();
    if (!template) return next(); // dev: Vite middleware serves the SPA
    const slug = (req.params as { slug?: string }).slug;

    if (!slug) {
      const head = [
        `<meta name="description" content="Live events at Grandma Jazz, Phuket. Reserve your place.">`,
        `<link rel="canonical" href="${eventsConfig.publicUrl}/events">`,
        `<meta property="og:title" content="Events — Grandma Jazz">`,
        `<meta property="og:description" content="Live events at Grandma Jazz, Phuket. Reserve your place.">`,
        `<meta property="og:url" content="${eventsConfig.publicUrl}/events">`,
        `<meta property="og:type" content="website">`,
      ].join("\n");
      res.set("Cache-Control", "public, max-age=60");
      res.send(renderWithHead(template, head, "Events — Grandma Jazz"));
      return;
    }

    const [row] = await db
      .select({ event: events, venue: venues })
      .from(events)
      .leftJoin(venues, eq(venues.id, events.venueId))
      .where(and(
        eq(events.slug, slug),
        inArray(events.status, ["published", "registration_closed", "cancelled", "completed"]),
      ))
      .limit(1);
    if (!row) {
      // unknown slug → plain SPA shell (client renders its 404 state)
      res.status(404).send(renderWithHead(template, "<meta name=\"robots\" content=\"noindex\">", "Event not found — Grandma Jazz"));
      return;
    }
    const { event, venue } = row;
    const title = `${event.ogTitle || event.title} — Grandma Jazz`;
    const description = (event.ogDescription || event.subtitle || `${event.title} at Grandma Jazz`).slice(0, 300);
    const canonical = `${eventsConfig.publicUrl}/events/${event.slug}`;
    const image = event.heroImagePath ? `${eventsConfig.publicUrl}${event.heroImagePath}` : null;
    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Event",
      name: event.title,
      startDate: event.startsAt.toISOString(),
      endDate: event.endsAt.toISOString(),
      eventStatus: event.status === "cancelled"
        ? "https://schema.org/EventCancelled"
        : "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      url: canonical,
      organizer: { "@type": "Organization", name: "Grandma Jazz", url: eventsConfig.publicUrl },
      offers: {
        "@type": "Offer", price: "0", priceCurrency: "THB", url: canonical,
        availability: "https://schema.org/InStock",
      },
    };
    if (image) jsonLd.image = [image];
    if (venue) {
      jsonLd.location = {
        "@type": "Place",
        name: venue.name,
        address: [venue.addressLine1, venue.city, venue.country].filter(Boolean).join(", ") || venue.name,
      };
    }
    const head = [
      `<meta name="description" content="${escapeHtml(description)}">`,
      `<link rel="canonical" href="${canonical}">`,
      `<meta property="og:title" content="${escapeHtml(title)}">`,
      `<meta property="og:description" content="${escapeHtml(description)}">`,
      `<meta property="og:url" content="${canonical}">`,
      `<meta property="og:type" content="website">`,
      image ? `<meta property="og:image" content="${escapeHtml(image)}">` : "",
      `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`,
      `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`,
    ].filter(Boolean).join("\n");
    res.set("Cache-Control", "public, max-age=30");
    res.send(renderWithHead(template, head, title));
  } catch (err) {
    next(err);
  }
}

async function servePrivateHtml(
  req: Request, res: Response, next: NextFunction,
  opts: { referrer?: string },
): Promise<void> {
  try {
    const template = loadIndexTemplate();
    if (!template) return next();
    const head = [
      `<meta name="robots" content="noindex, nofollow, noarchive">`,
      opts.referrer ? `<meta name="referrer" content="${opts.referrer}">` : "",
    ].filter(Boolean).join("\n");
    res.set("Cache-Control", "private, no-cache, no-store, must-revalidate");
    if (opts.referrer) res.set("Referrer-Policy", "no-referrer");
    res.send(renderWithHead(template, head, "Grandma Jazz"));
    void req;
  } catch (err) {
    next(err);
  }
}
