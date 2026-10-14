import type { GarmentsIssue } from "./issues";

// Paper copy is taken from the approved Garments Canva master and public brand bio.
const snippets: Record<string, { reverse: string; closing: string }> = {
  "001": { reverse: "Pieces with history. Given new life.", closing: "Your story is waiting. Discover your piece of the past." },
  "002": { reverse: "Not factory new. Human new.", closing: "Somebody else will wear it again." },
  "003": { reverse: "Still catching eyes. Still got somewhere to go.", closing: "One piece only. Come find it." },
  "004": { reverse: "Not everything old needs replacing.", closing: "Real clothes look lived in." },
  "005": { reverse: "Still wearable. Still wanted.", closing: "Wear what exists. Still wearable. Still wanted." },
  "006": { reverse: "Old is the point. Not the problem.", closing: "Your next favourite might already exist." },
  "007": { reverse: "Playing it safe is overrated. Always has been.", closing: "Boring never becomes vintage. Worth remembering." },
  "008": { reverse: "No noise. No rush. No problem.", closing: "Classic never needs reinventing. Worth holding onto." },
  "009": { reverse: "It wasn’t made to match. That was never the point.", closing: "Some things you can’t fake. This is one of them." },
  "010": { reverse: "No rules. No repeats. No regrets.", closing: "Built for the life you actually live." },
  "011": { reverse: "Oversized, not overthought.", closing: "More jacket. Less effort. For coffee runs, long days, late nights." },
  "012": { reverse: "No trend. No season. No expiry date.", closing: "It already had one life. This one is yours." },
};

export function paperForIssue(issueNumber: string) {
  const number = String(Number(issueNumber)).padStart(3, "0");
  const key = snippets[number] ? number : "012";
  return { key, reverseImage: `/garments/paper/reverse-${key}-v2.webp`, closingImage: `/garments/paper/closing-${key}-v2.webp`, ...snippets[key] };
}

export function withBrandPaper(issue: GarmentsIssue): GarmentsIssue {
  if (issue.isDevelopmentFixture) return issue;
  const paper = paperForIssue(issue.issueNumber);
  return { ...issue, backCover: { ...issue.backCover, image: paper.closingImage, thumbnail: paper.closingImage, alt: `${paper.closing} With love, Grandma Jazz. Garments embossed monogram.`, text: paper.closing } };
}
