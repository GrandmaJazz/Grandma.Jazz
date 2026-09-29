# Grandma Jazz — Shop Catalogue Handover

**Updated:** 17 September 2026
**Repo:** `~/Grandma.Jazz` (Next.js)
**API:** `https://grandma-jazz-api.onrender.com` (Express, MongoDB, S3 at `grandma-jazz-uploads`, ap-southeast-2)
**Live shop:** https://grandmajazz.com/products

---

## 1. Status

Shop went from **9 products (all Merchandise)** to **17 products across three categories**. Coffees now has coffee beans. The sole listing in Teas is a storage jar, so the Teas category still has no actual tea for sale.

### Original catalogue additions (historical prices; see §3 for live corrections)

| Product | Category | Price | Weight | Image |
|---|---|---|---|---|
| Smoking bag | merchandise | $10 | 0.3 kg | real photo |
| T-shirt | merchandise | $55 | 0.3 kg | real photo ×3 |
| Matches | merchandise | $10 | 0.05 kg | real photo (studio) |
| Umbrella | merchandise | $39 | 0.5 kg | real photo |
| Coffee beans | **coffees** | $32 | 0.25 kg | **placeholder** |
| Storage jar | **teas** | $25 | 0.5 kg | **placeholder** |
| Zippo | merchandise | $115 | 0.2 kg | **placeholder** |
| Rolling kit | merchandise | $65 | 0.8 kg | **placeholder** |

### Edited (not duplicated)

- **Hand fan** — added normalised studio-graded photo. Price/description/weight were already correct.
- **Bamboo j holder** — added Bam's studio shot as primary image (listing was thin on photos).

### Pre-existing, untouched

Classic snake board game · Smoking Hat · Rolling tray · Cork Coaster · Coffee bottle · Classic Grinder · Small grinder

---

## 2. Bugs found — highest priority first

### 2.1 Product create/update failures were silent in the admin UI — feedback fixed, root cause still to verify

**This is the big one.** `POST /api/products` and `PUT /api/products/:id` work perfectly when called directly. The admin form fails maybe half the time and **says nothing** — the button greys out, hangs ~20s, re-enables, form still populated, no toast, no console error, no network request.

Roughly six products were lost to this before it was spotted, because a failed save is visually indistinguishable from a slow one.

Direct API calls with the same payload returned `201`, but that does not isolate the failure: the form uploads each image before it sends the product request. A failed or stalled upload can explain a grey button with no product POST.

**Where to look:** `src/app/admin/products/new/page.tsx`, `handleSubmit`.

The catch did call `toast.error`, but there were two Toaster instances and no persistent form-level error. The form now shows the active stage and a persistent error banner, validates the upload response and file size, and uses the shared JSON product API client. Uploads and saves have timeouts, so a stalled request no longer leaves an indefinite spinner. The second Toaster was removed.

**Still to verify:** reproduce the original intermittent failure with an admin account and inspect the upload and product requests separately. The cause was not proved by the successful console calls.

### 2.2 Session expiry — in-progress form preserved

`fetchWithAuth` previously cleared the token and navigated to `/login` on 401, discarding the form and selected files. It now clears the expired token without navigating, shows a session-expired message, and the product form offers a sign-in link in a new tab. Once signed in there, retry the preserved form in the original tab.

Token refresh or an advance expiry warning would need backend support and remain future improvements.

### 2.3 Mixed-language error strings

The product create/edit upload errors are now English. Other admin screens may still mix English and Thai; a broader language pass is separate work.

### 2.4 Featured cap message is misleading

The maximum-of-four note now appears only while the Featured filter is selected. The toggle still reports the limit when someone tries to exceed it.

---

## 3. Pricing model — replaced by Phase I (17 September 2026)

Option C is retired. Product price = verified store THB price / 33.28, rounded to USD cents, with no postage. Checkout obtains a server quote for product weight plus one packaging allowance and the destination country, then shows products, discount, shipping and total before payment.

The implementation is in this frontend and the separate backend checkout at `/Users/accorreya/Grandma.Jazz.Backend`. See that repo's `docs/SHOP-PHASE-I.md` for the maintained rate table, verified pricing plan, tests and coordinated rollout. The 15 verified product prices and two description corrections are live and verified through the public API. All 17 weights were preserved. The checkout code remains local; both services still need a coordinated deployment.

The T-shirt uses the user's correction to THB 1,300 ($39.06). Rolling kit and Storage jar are **not guessed**: neither was found in the inspected POS export, so their existing prices remain pending verification. The export also conflicts with earlier agreed prices for Smoking bag, Matches, Hand fan and Zippo; the user has now confirmed 160 THB for Smoking bag, Matches and Hand fan, and 3,300 THB for Zippo; the live listings are now $4.81 each and $99.16 respectively.

The backend now reloads every product price and weight, calculates shipping once, validates discounts and quantities, rejects changed quotes before payment, and persists the calculation with the order. It does not trust browser totals. Existing weights are preserved.

---

## 4. Outstanding work

### 4.1 Garments tab → external link (implemented in code)

Garments is **not** getting products. The filter button should become a text logo linking out to `https://grandmajazz.store/garments/`.

- The Garments wordmark in `public/images/garments.png` now links to `https://grandmajazz.store/garments/` in a new tab. The ↗ marker distinguishes it from the filter buttons.

### 4.2 Photography needed

Four products are live with **placeholder images** (black card, gold serif name, "photograph coming soon"):

- **Coffee beans** — never photographed
- **Zippo** — never photographed
- **Rolling kit** — never photographed as a complete set
- **Storage jar** — the UV jars have never been photographed

### 4.3 Copy fix: Storage jar

Completed live: removed the unverified UV claim. Description now reads: “A classic herb storage jar, just the way Grandma likes it.” Re-check specifications when the real jar is photographed.

### 4.4 Umbrella description is mine, not AC's

Every other description is AC's own words. The umbrella had none, so this was written in Grandma's voice as a placeholder:

> "Rain or shine, Grandma has you covered. Built to last longer than the storm, and to look right on the walk home."

Completed live: replaced with “A Grandma Jazz umbrella for rainy days and a little shade on the walk home.”

---

## 5. Photo assets and pipeline

### Sources

- **Bam's studio photos** — Drive folder `Bam - Product photo` (`10yIS6A2AKG6oIvb7NZJLBqsmVcEU5Tv0`), owner `arnanrunchita@gmail.com`. ~46 files, black-background studio work. Contains bamboo joint holders, grinders, matches, Bambu papers (old stock), coffee decanter.
- **SONY CAMERA folders** (iCloud Drive, `Grandma Jazz/Media/SONY CAMERA/`):
  - `1` — 93 ARW. Bamboo holders, Smoking Hat, hand fans, smoking bags (black + cream, empty + filled), T-shirts.
  - `3` — 53 ARW. Umbrellas (closed + open + lifestyle), GARMENTS clothing rail, hat portraits, tote bag.
  - `5` — 7 MP4 video files, no stills.

### Working with .ARW files

No raw converter is available on the Cowork VM (no `sips`, `dcraw`, `exiftool`; ImageMagick can't decode ARW). The workaround: **extract the embedded full-size JPEG preview** by scanning for JPEG SOI/EOI markers (`\xff\xd8\xff` … `\xff\xd9`) and taking the largest segment. Fast, no dependencies.

**Two gotchas:**
- iCloud files may be cloud-only — reads fail with `OSError [Errno 35] Resource deadlock avoided`. Right-click → Download Now in Finder first.
- The embedded previews **do not carry EXIF orientation**. Portrait shots come out sideways. Rotate explicitly; `-auto-orient` won't help.

### Normalisation recipe

AC's lifestyle shots (warm tungsten café interiors) and Bam's studio work (black background, controlled light) are two different visual languages. Chosen approach: **grade the lifestyle shots toward the studio look.** Not AI regeneration — these ship to real customers and the photo must match the object.

```bash
convert IN.jpg -auto-orient \
  -resize 1400x1400^ -gravity center -extent 1200x1200 \
  -channel R -evaluate multiply 0.94 -channel B -evaluate multiply 1.06 +channel \
  -modulate 97,88,100 -brightness-contrast -4x12 \
  -unsharp 0x1+0.6+0.02 OUT.jpg
```

Adjust `-brightness-contrast` per image — black garments crush to solid black at `-7x16`.

**Grid format is `aspect-square` with `object-cover`** (`src/components/ProductCard.tsx:51`, and `src/app/products/[id]/page.tsx:108`). Pre-crop to 1200×1200 square or the CMS crop will cut the subject.

---

## 6. Reference

### Category IDs

`merchandise` · `coffees` · `teas` · `garments` — formerly duplicated across the public shop, admin list, and both admin forms. They now come from `src/lib/productCategories.ts`. Garments remains an admin category but is an external link in the public shop.

### Admin form required fields

name · price (USD) · weight (kg, 0–30) · description · category · **at least one image**. Form refuses to submit without all six.

### Working API pattern (bypasses the broken form)

```js
// From the admin page console, token already in localStorage
const t = localStorage.getItem('token');
const fd = new FormData(); fd.append('image', file);
const up = await fetch(API + '/api/upload', {
  method: 'POST', headers: { Authorization: 'Bearer ' + t }, body: fd
});
const { file: { url } } = await up.json();

await fetch(API + '/api/products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
  body: JSON.stringify({ name, price, weight, description, category, isFeatured: false, isOutOfStock: false, images: [url] })
});
```

`/api/upload` returns `{ file: {...} }`; `/api/upload/multiple` returns `{ files: [...] }`. Both work and return `201`.

### ISR caching

`src/app/products/page.tsx:18` sets `export const revalidate = 300`. New products take up to **5 minutes** to appear on the public page. Don't assume a failed write when the API already shows the product.

---

## 7. Suggested order of work

1. **Reproduce the intermittent save failure** (§2.1) with an admin account; inspect the upload and product requests separately. The error is now visible and the form remains intact.
2. **Deploy and verify Phase-I checkout** (§3) across both repositories; obtain verified Rolling kit and Storage jar POS prices.
3. **Shoot the four missing products** (§4.2), then replace placeholders and check the Storage jar claim.
4. Decide whether the Teas category needs a real tea product or a different label.

## 29 September 2026 — whole-dollar product pricing

User requested rounding every online product price up to the next whole USD for appearance. All 15 fractional prices were updated and verified in the live admin. Bamboo holder $11; board game $17; Smoking Hat $12; Rolling tray $17; Hand fan $5; Cork Coaster $5; Coffee bottle $22; Classic Grinder $17; Small grinder $7; Smoking bag $5; T-shirt $40; Matches $5; Umbrella $25; Coffee beans $17; Zippo $100. Storage jar $25 and Rolling kit $65 were already whole-dollar prices and remain unchanged pending POS verification. This supersedes the fractional prices recorded above. Shipping remains separate.
