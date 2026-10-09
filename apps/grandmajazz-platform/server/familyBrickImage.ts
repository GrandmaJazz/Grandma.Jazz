import sharp from "sharp";
import { registerFont } from "canvas";
import path from "node:path";
import { brickSvg } from "../shared/family-original/brickArtwork";

let ready = false;
export async function renderOriginalFamilyBrick(title: string, name: string): Promise<Buffer> {
  if (!ready) {
    registerFont(path.resolve("server/fonts/Roboto-Light.ttf"), { family: "Roboto", weight: "300" });
    ready = true;
  }
  return sharp(Buffer.from(brickSvg(title, name))).png().toBuffer();
}
