# Promotion readiness — 31 October 2026

Status: NOT cleared for promotion. The owner approved publishing on 31 October; deployment and end-to-end acceptance remain to be verified. Preserve the existing visual design.

## Prepared fixes

- Merge published and recurring dates into a single upcoming list, soonest first, with no duplicate quiz dates. Keep in-progress events visible until their end time. Place past dates beneath upcoming dates, newest first. Match structured-data order to the visible list.
- Correct the events introduction's reference from dates “above” to dates “below”.
- Label the basket amount as subtotal and explain that shipping/discounts are calculated at checkout.
- Preserve existing checkout padding and design; permit wrapping in item and discount rows to prevent overflow.
- Label shipping address, discount input, discount removal and product quantity controls; cap product-page quantity at the backend maximum of 99.
- Show successful discount styling only after the server returns an applied discount.
- Preserve shipping-destination errors separately from quote errors; block payment until a supported destination is loaded.
- Add an opt-in first-order-only discount setting. Companion backend branch `fix/first-order-eligibility-20261031` checks previous paid orders at validation, quote creation, checkout creation and payment retry. Existing codes retain their prior behaviour. No offer was created or activated.

## Checks

- 74 frontend tests pass, including mixed event ordering, ongoing events, duplicate prevention and the exact end-time boundary.
- Frontend TypeScript check passes separately from Next's build (the repository currently skips build-time type validation).
- 47 backend tests pass; backend syntax/build check passes.
- Next production compilation passes. Complete local page generation is not verified: this checkout lacks NEXT_PUBLIC_API_URL and the blogs page times out. A correctly configured hosted build remains required.
- Live desktop browser: shop listing, coffee detail, add-to-basket, current-price loading, checkout sign-in handoff, event listing/detail and delivery information work. Music continued through navigation.
- The live event detail exposes reservation controls, but no registration was submitted.
- Shell HTTP requests to most live pages returned 403 while the browser worked; these are not evidence that the site is down.

## Outstanding launch checks

- Explicit approval to push both repositories, then verify their deployments and re-test the changed pages.
- Test authenticated checkout, successful payment, cancelled payment, payment retry, webhook/order reconciliation, customer confirmation and merchant receipt using an authorized test account/payment flow. No payment or customer email was sent during this audit.
- Test first-order code eligibility with new and returning customers, including simultaneous open checkout sessions. The new eligibility check is account-based; it is not a cross-session reservation or a cross-account identity check.
- Actual browser checks at 320, 390, 1050 and 1440 widths remain outstanding; the available cloud browser did not expose viewport resizing.
- Confirm promotion amount, code, dates and applicable items before enabling the offer.
- Review event content: today's event says “21+ only” while sign-in asks “over 20”; its contact telephone link is `tel:948605652` without the international prefix. These fields belong to the independently hosted event platform and were not changed.
- Shipping is intentionally limited: automatic overseas quotes cover selected ordinary merchandise and four countries. Coffee requires an overseas contents/destination check; Garments is a lookbook with direct enquiries. Advertising must reflect those flows.
- The independent event/Family/Garments platform still has a VPS dependency in source. No hosting migration was attempted.
