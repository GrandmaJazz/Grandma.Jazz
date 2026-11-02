export interface CoverPart {
  text: string;
  accent?: boolean;
  bold?: boolean;
}
export const journalDesign: Record<
  string,
  { parts: CoverPart[]; accent: string; category: string }
> = {
  "our-first-garments-donation-11300-for-phukets-elderly": {
    parts: [
      {
        text: "A little rack.",
        accent: false,
        bold: false,
      },
      {
        text: "A LOT\nOF LOVE.",
        accent: true,
        bold: true,
      },
    ],
    accent: "GARMENTS",
    category: "Community",
  },
  "cannabis-tourism-in-phuket-how-to-spend-a-slow-weekend": {
    parts: [
      {
        text: "The art of",
        accent: false,
        bold: false,
      },
      {
        text: "slowing\ndown.",
        accent: true,
        bold: false,
      },
    ],
    accent: "Slow Weekend",
    category: "Visiting",
  },
  "a-locals-guide-to-kamala-what-to-do-around-grandma-jazz": {
    parts: [
      {
        text: "Kamala.",
        accent: false,
        bold: false,
      },
      {
        text: "LIKE\nA LOCAL.",
        accent: true,
        bold: true,
      },
    ],
    accent: "Kamala",
    category: "Visiting",
  },
  "is-cannabis-legal-in-phuket-an-honest-2026-guide": {
    parts: [
      {
        text: "Cannabis.",
        accent: false,
        bold: false,
      },
      {
        text: "Legal?",
        accent: true,
        bold: false,
      },
      {
        text: "LET’S TALK.",
        accent: true,
        bold: true,
      },
    ],
    accent: "Legal",
    category: "Visiting",
  },
  "a-room-that-listens": {
    parts: [
      {
        text: "A room\nthat ",
        accent: false,
        bold: false,
      },
      {
        text: "listens.",
        accent: true,
        bold: false,
      },
    ],
    accent: "Listens",
    category: "Music",
  },
  "how-to-run-a-plastic-free-dispensary": {
    parts: [
      {
        text: "Less plastic.",
        accent: false,
        bold: false,
      },
      {
        text: "MORE\nCARE.",
        accent: true,
        bold: true,
      },
    ],
    accent: "Plastic-Free",
    category: "Café life",
  },
  "coffee-cake-and-no-alcohol-at-all": {
    parts: [
      {
        text: "Coffee.\nCake.",
        accent: false,
        bold: false,
      },
      {
        text: "No alcohol.",
        accent: true,
        bold: false,
      },
    ],
    accent: "Coffee",
    category: "Café life",
  },
  "sessions-with-grandma": {
    parts: [
      {
        text: "Sessions\nwith ",
        accent: false,
        bold: false,
      },
      {
        text: "Grandma.",
        accent: true,
        bold: false,
      },
    ],
    accent: "Grandma",
    category: "Music",
  },
  "a-legacy-continued-our-story-in-skunk": {
    parts: [
      {
        text: "A legacy,",
        accent: false,
        bold: false,
      },
      {
        text: "continued.",
        accent: true,
        bold: false,
      },
    ],
    accent: "Legacy",
    category: "Our story",
  },
  "how-we-help-you-choose": {
    parts: [
      {
        text: "A little help",
        accent: false,
        bold: false,
      },
      {
        text: "choosing.",
        accent: true,
        bold: false,
      },
    ],
    accent: "Choose",
    category: "Visiting",
  },
  "visiting-grandma-jazz-a-guide-to-finding-us": {
    parts: [
      {
        text: "Up the hill.",
        accent: false,
        bold: false,
      },
      {
        text: "WORTH\nTHE TURN.",
        accent: true,
        bold: true,
      },
    ],
    accent: "Finding Us",
    category: "Visiting",
  },
  "the-quiet-revolution-of-grandma-jazz": {
    parts: [
      {
        text: "A quiet",
        accent: false,
        bold: false,
      },
      {
        text: "revolution.",
        accent: true,
        bold: false,
      },
    ],
    accent: "Quiet Revolution",
    category: "Our story",
  },
  "high-times-named-us-the-worlds-first-plastic-free-dispensary": {
    parts: [
      {
        text: "The world’s\nfirst.",
        accent: false,
        bold: false,
      },
      {
        text: "PLASTIC\nFREE.",
        accent: true,
        bold: true,
      },
    ],
    accent: "Plastic-Free",
    category: "Our story",
  },
  "why-grandma-jazz-exists-a-quiet-caf-built-on-care-community-and-inclusion": {
    parts: [
      {
        text: "A café\nbuilt on",
        accent: false,
        bold: false,
      },
      {
        text: "care.",
        accent: true,
        bold: false,
      },
    ],
    accent: "Care",
    category: "Our story",
  },
  "garments-why-wearing-second-hand-clothing-still-makes-sense": {
    parts: [
      {
        text: "Old clothes.",
        accent: false,
        bold: false,
      },
      {
        text: "NEW\nSTORIES.",
        accent: true,
        bold: true,
      },
    ],
    accent: "Second-Hand",
    category: "Community",
  },
  "a-plastic-free-cannabis-caf-how-grandma-jazz-chose-reuse-over-convenience": {
    parts: [
      {
        text: "Reuse.\nRefill.",
        accent: false,
        bold: false,
      },
      {
        text: "REPEAT.",
        accent: true,
        bold: true,
      },
    ],
    accent: "Reuse",
    category: "Café life",
  },
};
export const journalTopics = [
  "All stories",
  "Café life",
  "Music",
  "Community",
  "Visiting",
  "Our story",
] as const;
export function journalCategory(post: {
  slug: string;
  title: string;
  tags?: string[];
}) {
  return (
    journalDesign[post.slug]?.category ||
    (/music|session|spotify|youtube/i.test(
      post.title + " " + post.tags?.join(" "),
    )
      ? "Music"
      : /garments|family|review|fundraiser|community/i.test(
            post.title + " " + post.tags?.join(" "),
          )
        ? "Community"
        : /guide|visiting|phuket|first visit|where|driving|etiquette/i.test(
              post.title + " " + post.tags?.join(" "),
            )
          ? "Visiting"
          : /story|AC & Joy|collaboration/i.test(post.title)
            ? "Our story"
            : "Café life")
  );
}
export const readingMinutes = (content: string) =>
  Math.max(
    1,
    Math.ceil(content.replace(/\[[^\]]*\]/g, "").split(/\s+/).length / 220),
  );
