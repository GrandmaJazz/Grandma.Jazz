import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

// nginx terminates TLS and proxies to this process; needed for secure cookies
// and correct client IPs (rate limiting) in the events module.
app.set("trust proxy", 1);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: '50mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '50mb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

function normalizeBase(p?: string): string {
  if (!p || p === "/") return "/";
  let v = p.startsWith("/") ? p : `/${p}`;
  if (!v.endsWith("/")) v = `${v}/`;
  return v;
}

const BASE_PATH = normalizeBase(process.env.BASE_PATH);

(async () => {
  console.log(`[Startup] NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`[Startup] BASE_PATH: ${BASE_PATH}`);

  const apiRouter = await registerRoutes();
  app.use(BASE_PATH, apiRouter);

  // Events platform module (public pages, organizer tools, ticketing APIs)
  // mounted beneath /events — must precede the SPA fallback.
  const { mountEventsModule } = await import("./events");
  await mountEventsModule(app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(err);
    const status = err.status || err.statusCode || 500;
    const message = status >= 500 ? "Internal Server Error" : err.message || "Request failed";
    if (status >= 500) console.error("[server] request failed:", err.message);

    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app, BASE_PATH);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "3000", 10);
  const host = process.env.HOST || "0.0.0.0";
  httpServer.listen({ port, host, reusePort: true }, () => {
    log(`serving on http://${host}:${port}${BASE_PATH}`);
  });
})();
