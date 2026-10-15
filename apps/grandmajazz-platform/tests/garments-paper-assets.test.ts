import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { paperForIssue } from "../client/src/garments/brandPaper";

describe("delivered paper artwork", () => {
  it.each(Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(3, "0")))
    ("retains visible natural fibres in issue %s at phone and desktop sizes", async issue => {
      const paper = paperForIssue(issue);
      for (const image of [paper.reverseImage, paper.closingImage]) {
        const file = new URL(`../client/public${image}`, import.meta.url);
        for (const width of [390, 820]) {
          const height = Math.round(width * 4 / 3);
          const patch = await sharp(file.pathname).resize(width, height)
            .extract({ left: Math.round(width * .1), top: Math.round(height * .1), width: Math.round(width * .8), height: Math.round(height * .25) }).png().toBuffer();
          const sample = await sharp(patch).stats();
          // This unprinted patch was almost uniform (stdev < .3) when the SVG
          // decoder discarded its embedded WebP background during export.
          expect(sample.channels[0].stdev, `${image} at ${width}px`).toBeGreaterThan(1.2);
          expect(sample.channels[0].mean).toBeGreaterThan(230);
        }
      }
    });
});
