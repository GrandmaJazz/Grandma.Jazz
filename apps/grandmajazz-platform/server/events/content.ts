import sanitizeHtml from "sanitize-html";

/** Only images we stored ourselves may be embedded in rich text. */
const LOCAL_IMAGE_SRC = /^\/events\/uploads\/[a-f0-9]{32}\.webp$/;

/** Strict rich-text policy for organizer-authored event descriptions. */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "em", "u", "s", "h2", "h3", "ul", "ol", "li", "a", "blockquote", "img"],
    allowedAttributes: { a: ["href", "rel", "target"], img: ["src", "alt"] },
    allowedSchemes: ["https", "http", "mailto", "tel"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
    },
    exclusiveFilter: (frame) =>
      // drop any img whose src is not one of our own re-encoded uploads
      frame.tag === "img" && !LOCAL_IMAGE_SRC.test(String(frame.attribs?.src || "")),
    disallowedTagsMode: "discard",
  });
}

export function htmlToText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const RESERVED_SLUGS = new Set([
  "manage", "platform", "api", "t", "assets", "uploads", "login", "register",
  "health", "admin", "static", "new", "preview", "calendar", "ical",
]);

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function validateSlug(slug: string): string | null {
  if (!/^[a-z0-9][a-z0-9-]{0,77}[a-z0-9]$/.test(slug)) {
    return "Slug must be 2-80 characters of lowercase letters, numbers and hyphens";
  }
  if (RESERVED_SLUGS.has(slug)) {
    return `"${slug}" is a reserved path and cannot be used as an event slug`;
  }
  return null;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
