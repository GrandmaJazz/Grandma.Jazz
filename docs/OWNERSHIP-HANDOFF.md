# Grandma Jazz ownership handoff

## Source and hosting

The current website and complete Family Wall, events, wallet, Garments, and platform settings backend are in this GrandmaJazz-owned repository. The existing shop backend remains in GrandmaJazz/Grandma.Jazz.Backend and already runs separately on Render. Preserve the current website and shop design; the older Mac checkout contains unfinished work and is behind this branch.

- Website: root Next.js app, hosted on Grandma Jazz's Vercel account.
- Platform: `apps/grandmajazz-platform`, PostgreSQL, persistent uploads, PM2 on `0.0.0.0:3000`.
- Deployment: root `render.yaml` and the platform Dockerfile. Deploy from the entire repository so shared website components are available.
- Settings: platform event/wallet/Family settings and Garments management are included in the platform source.

## Remaining work before shutting down the development VPS

**Production still depends on the development VPS. Publishing source does not remove that dependency.**

1. Use Grandma Jazz's Render account to create the web service, PostgreSQL database, and persistent disk from `render.yaml`. Review the displayed paid resource costs before applying it.
2. Restore the private PostgreSQL dump and uploads. A snapshot was restored successfully during preparation; take a final snapshot during a coordinated write pause before switching production. Transfer secrets through private hosting configuration only.
3. Preserve `EVENTS_TOKEN_SECRET`, the Family admin key, Apple pass identifiers/signing keys, Google service account/issuer, and registered wallet device data. Use a new independent session secret if desired. Supply secrets using the platform README instructions.
4. Configure and validate email, Mailchimp, and wallet providers. The blueprint intentionally starts with email delivery and wallet pushes disabled during migration; enable the required providers after reviewing restored jobs and configuration. Do not send test messages to customers.
5. In Grandma Jazz's Vercel project set `EVENTS_PLATFORM_ORIGIN` to the new backend origin and redeploy. Replace the development VPS fallback in `next.config.js` only once the new origin works.
6. Preserve legacy `.store` ticket and Apple pass update URLs through a Grandma Jazz-owned bridge or reissue the affected passes before retiring the old endpoint.
7. Verify Family registration/wall/export, event registration/check-in, Garments upload/conversion/publication, admin settings, email delivery, and Apple/Google wallet updates. Verify the existing shop and payments remain available.
8. Repeat acceptance checks with all traffic to the development VPS blocked. Shut it down only after every relevant request and background job runs on Grandma Jazz-owned infrastructure.

## Private transfer material

A private migration package is prepared separately from Git. It contains a PostgreSQL custom-format dump, uploaded files, provider secret files, runtime configuration, and checksums. Never commit it or copy its contents into this document. Request the package from the development VPS operator for the authorized production restore.

The package is a point-in-time snapshot, not a replacement for the final delta at cutover. Use PostgreSQL 16 or newer restore tooling.

## Verification completed during preparation

- Current website TypeScript checks, existing tests, and a Next.js production build passed.
- Platform TypeScript check and production bundle passed.
- Six wallet adapter tests passed.
- The database snapshot restored into a separate isolated PostgreSQL instance; counts were checked for Family members, events, tickets, and Garments editions.
- The Docker production image built successfully. Runtime permission and persistent Family cache fixes were verified against the restored database with networking restricted to the isolated test network. Family member API (576), public events, Garments editions (4), HTML pages, brand assets, and brick PNG generation returned HTTP 200.
- Real-device wallet acceptance, external provider delivery, authenticated shop admin access, and full production cutover still require verification in Grandma Jazz hosting.

No live database, hosting origin, or production service was switched during preparation.
