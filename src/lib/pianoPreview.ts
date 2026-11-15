export const PIANO_ATLAS = {
  count: 4, columns: 4, perSheet: 20, width: 384, height: 434,
} as const;

export function pianoFrame(progress: number) {
  const index = Math.round(Math.min(1, Math.max(0, progress)) * (PIANO_ATLAS.count * PIANO_ATLAS.perSheet - 1));
  const offset = index % PIANO_ATLAS.perSheet;
  return {
    index,
    sheet: Math.floor(index / PIANO_ATLAS.perSheet),
    x: (offset % PIANO_ATLAS.columns) * PIANO_ATLAS.width,
    y: Math.floor(offset / PIANO_ATLAS.columns) * PIANO_ATLAS.height,
  };
}
