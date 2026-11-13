/** Preserve the exact title and punctuation, accenting one word. */
export function AccentText({ text, word }: { text: string; word?: string }) {
  const matches = [...text.matchAll(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)];
  const match = (word && matches.find(part => part[0].toLowerCase() === word.toLowerCase())) || matches.at(-1);
  if (!match || match.index === undefined) return <>{text}</>;
  const at = match.index;
  return <>{text.slice(0, at)}<span className="gj-title-accent">{match[0]}</span>{text.slice(at + match[0].length)}</>;
}
