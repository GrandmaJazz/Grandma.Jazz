/** One typography contract for Next pages and independently hosted publications.
 * Only descriptive copy opts into the quiet style; fields, totals, errors and
 * consent text retain their functional contrast and sizing. */
export const SITE_TYPOGRAPHY_CSS = String.raw`
:root {
  --gj-type-ink: #e3dcd4;
  --gj-type-accent: #b49b73;
  --gj-type-copy: rgba(227,220,212,.6);
  --gj-type-highlight: rgba(245,241,230,.78);
  --gj-type-copy-size: .875rem;
}
.gj-type-light {
  --gj-type-ink: #181818;
  --gj-type-accent: #79613d;
  --gj-type-copy: rgba(24,24,24,.7);
  --gj-type-highlight: rgba(24,24,24,.88);
}
:root .gj-display-title.gj-display-title,
:root .gj-section-title.gj-section-title {
  font-family: 'Silver Garden','Grandma Jazz Silver Garden',Georgia,serif;
  font-weight: 400;
  letter-spacing: -.035em;
  line-height: 1.04;
  color: var(--gj-type-ink);
  text-shadow: none;
}
:root .gj-display-title.gj-display-title { font-size: clamp(2.5rem,6.4vw,4.5rem); }
:root .gj-section-title.gj-section-title { font-size: clamp(1.5rem,3.2vw,2.5rem); line-height: 1.15; }
:root .gj-title-accent.gj-title-accent {
  font-family: inherit; font-weight: inherit; color: var(--gj-type-accent);
}
:root .gj-section-copy.gj-section-copy,
:root .gj-home-copy.gj-home-copy,
:root .journal .intro p,
:root .journal .dek,
:root .journal .summary,
:root .garments-page .garments-intro p,
:root .family-page .brick-heading > p,
:root .family-page .family-wall-intro > p,
:root .gj-com-events h1 + p {
  font-family: 'Roboto','Grandma Jazz Roboto',Arial,sans-serif;
  font-size: var(--gj-type-copy-size);
  font-weight: 300; letter-spacing: .025em; line-height: 1.55;
  color: var(--gj-type-copy);
}
:root .gj-display-title + .gj-section-copy { margin-top: 1rem; }
:root .gj-section-copy > p + p,
:root .gj-section-copy + .gj-section-copy { margin-top: .75rem; }
:root .gj-copy-highlight.gj-copy-highlight,
:root .garments-page .garments-intro strong {
  color: var(--gj-type-highlight); font-family: inherit; font-weight: 400;
}
/* Existing embedded headings already separate their accented word. */
:root .family-page .brick-heading h1 span,
:root .family-page .family-wall-intro h1 span,
:root .family-page .welcome-content h1 span {
  color: var(--gj-type-accent); font-family: inherit; font-weight: inherit;
}
:root .family-page .brick-heading > p,
:root .family-page .family-wall-intro > p { margin-top: 1rem; }
:root .garments-page .garments-intro span { color: inherit; font: inherit; }
:root .journal .masthead h1 > span { color: var(--gj-type-ink); }
:root .journal .masthead h1 .gj-title-accent { display: inline; margin: 0; }
:root .journal .intro .note { margin-top: .75rem; }
:root .journal .accent,
:root .journal .cover h2 b,
:root .journal .cover h2 > span { color: var(--gj-type-accent); font-weight: 400; }
/* Articles and policies are the content itself, rather than optional subtext. */
:root .gj-reading-copy { color: rgba(227,220,212,.85); font-size: 1rem; line-height: 1.65; letter-spacing: .01em; }
@media (min-width:640px) { :root { --gj-type-copy-size: .9375rem; } }
`;
