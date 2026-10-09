import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express, basePath = "/") {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // The /garments SPA path shares its name with a public assets directory.
  // Let the SPA fallback handle the directory URL instead of redirecting it.
  app.use("/family-wall", express.static(path.join(distPath, "family-wall"), { index: "family-wall.html", redirect: false }));
  app.use(basePath, express.static(distPath, { redirect: false }));

  // SPA fallback under the base path
  const fallback = basePath === "/" ? "*" : `${basePath.replace(/\/$/, "")}/*`;
  app.get(fallback, (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
