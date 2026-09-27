# Shop changes and release checks

## Behavior

Merchandise prices round up to whole USD per unit throughout cards, details, cart, checkout and shop structured data. The backend also rounds stored legacy prices when exposing products and when creating payments. Postage and discounts keep their cents. Old paid order amounts remain unchanged.

The Garments wordmark is 32 px high on mobile and 40 px on desktop, twice its previous size; the arrow is removed. The existing collection link remains accessible and announces that it opens a new tab.

Checkout obtains supported destinations and shipping quotes from the backend. A quote includes fresh unit prices and one shipping charge. Changing country or basket invalidates the quote and discount preview immediately. Loading, missing rates and unavailable shipping never appear as $0 postage. Payment is disabled until a reviewed quote exists. A server conflict refreshes the quote for review.

Product editors can enter measured individual paper protection and approve products for checked destinations. Outer parcel profiles, current carrier rates and the merchant exchange rate are deployment settings described in the backend's `SHIPPING_AND_PACKAGING.md`. International payment remains unavailable until those real measurements and approvals are entered.

## Loading changes

- Cart and login UI are loaded on first use. The cart stays mounted after its first opening to retain its product cache and close animation.
- The music-gate carousel is loaded only when the gate is shown. Visible covers get connection priority; offscreen preloads begin afterwards. Cached-image handlers attach before setting `src`, image waits are bounded, and the extra 300 ms handoff delay is removed. Failed/empty music requests offer a retry.
- The bamboo scene renders on scroll, resizing and texture completion instead of continuously rendering while idle.
- Public product requests omit authentication and JSON headers that previously caused extra cross-origin preflight requests. All public server data reads are bounded rather than waiting indefinitely for an upstream service.
- Saved carts retain only product IDs and quantities, so old fractional prices cannot persist across visits. Detail-loading races preserve the user's latest quantity.
- Both repositories' existing inconsistent npm lockfiles are repaired; clean installs were checked.

## Evidence and limits

On 18 September 2026, public requests from the coding environment returned shop first-byte times of 11.53/11.54 seconds and API first-byte times of 11.33/13.51 seconds. These are environment-specific request measurements, not an iPhone performance score; network/proxy latency is included. They do not prove a Render cold start or quantify the effect of these undeployed changes. Measure production again after release on AC's device and from a Thailand location, including a repeat visit with an album already selected.

The configured production build completed with all 17 products in generated shop HTML. Its offers include Coffee bottle $22, Classic Grinder $17, Small grinder $7, Smoking bag $5, T-shirt $40 and Matches $5. Generated markup has no Garments arrow. The backend's 13 tests cover rate boundaries, packing, country caps, missing/expired approvals, dangerous goods, stale/tampered quotes and the real controller's payment path with mocked Stripe/database calls.

The full TypeScript check already fails in the base repository. Comparison with the same generated Next types and dependencies introduces no new error locations or codes. The existing Next build configuration skips type validation; a completed build is not a claim that the repository's full typecheck is green. Resolve those existing errors separately.

## Coordinated deployment

Stage the frontend and backend together: the new backend rejects checkout requests without reviewed quote IDs, so an older client cannot complete checkout after the backend release. Test payment in Stripe test mode, then coordinate both production releases. Expire legacy unpaid checkout sessions as described in the backend handover. Paid historical orders are preserved.

Keep international checkout gated until actual packing measurements and current lane acceptance/rates are confirmed. Do not advertise unverified worldwide availability. Use the customer contact link for manual quotes while a lane or packing combination is unavailable. No live payments, supplier messages or production deployment were performed by these working changes.
