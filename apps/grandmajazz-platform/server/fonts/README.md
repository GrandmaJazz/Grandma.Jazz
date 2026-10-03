# Brick Font

The server-side brick PNG renderer (`server/brickImage.ts`) loads a custom font
to match the on-site Galvji styling used in the email and the canvas tile.

## Drop your font here

Place a TTF/OTF file at one of these paths (first match wins):

1. Path in env var `GRANDMA_FONT_PATH` (absolute path)
2. `server/fonts/Galvji-Light.ttf`
3. `server/fonts/brick-light.ttf`

Recommended: a light-weight (300) sans-serif. The renderer registers it as
font family `GrandmaSans` with weight `300`.

## If no font is found

The renderer falls back to the system `sans-serif` font and logs a warning.
The brick still renders correctly; only the typeface differs.

## Licensing note

Apple's Galvji is bundled with macOS/iOS and is **not freely redistributable**.
Do not commit the Galvji TTF to a public repo. Either:

- Keep this repo private and copy the font in manually during deploy
- Use a free alternative like Inter Light or Manrope Light renamed to
  `Galvji-Light.ttf`
