# Catalogue image delivery and colour options

Product heroes show the complete item against a neutral studio backdrop. Genuine photographs remain in the gallery; do not create fictitious lifestyle photos. Hat gallery positions 1–3 map to Cream, Black, Brown; bag positions 1–2 map to Black, White. Those positions are also used by the authoritative backend quote service. Preserve them when editing galleries.

After changing CMS images, run `npm run media:sync`, inspect the generated assets, then build and deploy. The command reads public catalogue images and large local site photographs and creates content-addressed WebP variants and an exact-source manifest. Old, unreferenced generated variants are removed. A newly uploaded URL not yet in the manifest retains its own original photograph, never another product's cached image. The paid Next image optimizer stays disabled. Originals remain in the CMS.

`ResponsiveImage` renders candidates in initial HTML, eagerly loads the first two catalogue photos and detail hero, and lazily loads other pictures. Thumbnails use small candidates. Hover photos are requested only for mouse interaction, and the current photo stays visible until its replacement loads. A failed variant falls back to its original source. Product detail images contain the entire frame.

Cart product reads share a pending request and a 30-second display cache. Payment and delivery always use a fresh server quote. Cart persistence waits for hydration. Colour variants have distinct cart keys, validated server-side prices, images and saved fulfilment fields; payment reconciliation removes only the purchased variant quantities. Old colourless cart lines ask for a colour at checkout.

Review drift pauses outside the viewport, in background tabs, and for reduced motion. The existing record player, music quality, camera and intro choreography remain owned separately. Repeating grain uses one rasterized texture rather than repeated SVG turbulence filters. Buttons animate specific properties without permanent GPU layer promotion.

Verification: run `npm test`, `npx tsc --noEmit`, `npm run build`; backend tests/build; platform check and complete platform/Family/server build. Check the live shop and colour variants at 320, 390, 1050 and 1440px, image changes, cart persistence, keyboard close/focus, header/menu, music and navigation. Do not submit payment or create production test orders.
