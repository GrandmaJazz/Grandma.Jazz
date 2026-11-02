export type Block =
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "quote"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "p"; text: string }
  | { kind: "image"; index: number }
  | { kind: "video"; id: string };

/* ---------- 1. Turn the raw content string into blocks ---------- */

export function parseContent(content: string): Block[] {
  const chunks = content.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const blocks: Block[] = [];

  for (const raw of chunks) {
    const text = raw.trim();
    if (!text) continue;

    // Tolerate markers written as **[IMAGE 1 — description]** or *[IMAGE 1]*
    const bare = text.replace(/^\*+/, "").replace(/\*+$/, "").trim();

    const imageMarker = bare.match(/^\[\s*image\s*(\d+)[\s\S]*\]$/i);
    if (imageMarker) {
      blocks.push({ kind: "image", index: parseInt(imageMarker[1], 10) - 1 });
      continue;
    }

    // Planning notes like [EMBED — pick the strongest performance] are skipped,
    // never printed. Paste the actual YouTube link on its own line instead.
    if (/^\[\s*(embed|note|todo)\b[\s\S]*\]$/i.test(bare)) continue;

    // A YouTube link on its own line becomes an inline player.
    const yt = bare.match(
      /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    );
    if (yt) {
      blocks.push({ kind: "video", id: yt[1] });
      continue;
    }

    if (/^###\s+/.test(text)) {
      blocks.push({ kind: "h3", text: text.replace(/^###\s+/, "") });
      continue;
    }
    if (/^##\s+/.test(text)) {
      blocks.push({ kind: "h2", text: text.replace(/^##\s+/, "") });
      continue;
    }
    if (/^>\s?/.test(text)) {
      blocks.push({
        kind: "quote",
        text: text
          .split("\n")
          .map((l) => l.replace(/^>\s?/, ""))
          .join(" ")
          .trim(),
      });
      continue;
    }

    const lines = text.split("\n");
    if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
      blocks.push({
        kind: "list",
        items: lines.map((l) => l.replace(/^\s*[-*•]\s+/, "").trim()),
      });
      continue;
    }

    blocks.push({ kind: "p", text });
  }

  return blocks;
}

/* ---------- 2. Place the images ---------- */

export function placeImages(blocks: Block[], imageCount: number): Block[] {
  const used = new Set(
    blocks
      .filter((b): b is Extract<Block, { kind: "image" }> => b.kind === "image")
      .map((b) => b.index),
  );

  // Markers were used — trust them, then append anything left over.
  if (used.size > 0) {
    const leftovers: Block[] = [];
    for (let i = 0; i < imageCount; i++) {
      if (!used.has(i)) leftovers.push({ kind: "image", index: i });
    }
    return [...blocks, ...leftovers];
  }

  // No markers — spread them evenly so it still reads well.
  if (imageCount === 0) return blocks;

  const textBlocks = blocks.filter((b) => b.kind !== "image");
  const out: Block[] = [];
  const step = Math.max(1, Math.floor(textBlocks.length / (imageCount + 1)));
  let placed = 0;

  textBlocks.forEach((block, i) => {
    out.push(block);
    if (placed < imageCount && i > 0 && (i + 1) % step === 0) {
      out.push({ kind: "image", index: placed });
      placed++;
    }
  });

  while (placed < imageCount) {
    out.push({ kind: "image", index: placed });
    placed++;
  }

  return out;
}

export function articleLayout(content: string, imageCount: number) {
  const parsed = parseContent(content);
  const explicit = parsed.some((b) => b.kind === "image");
  const blocks = placeImages(parsed, imageCount);
  const hero =
    imageCount > 0 &&
    (!explicit || (parsed[0]?.kind === "image" && parsed[0].index === 0));
  return {
    hero,
    blocks: hero
      ? blocks.filter((b) => !(b.kind === "image" && b.index === 0))
      : blocks,
  };
}
