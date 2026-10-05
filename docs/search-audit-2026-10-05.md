# Grandma Jazz backlink and structured-data audit

5 October 2026 · Phuket time · No paid services added.

**Status: public backlink audit completed; verified website schema fixes deployed.** Google account validation, referral attribution and third-party corrections are separate follow-ups, not claimed as completed.

## Changes deployed

[PR #34](https://github.com/GrandmaJazz/Grandma.Jazz/pull/34) fixes the public website at grandmajazz.com. Main commit: `5cab477fb88cfc782c7cf1a5161ee0553639a95d`. The prior redirect-loop fix remains in [PR #33](https://github.com/GrandmaJazz/Grandma.Jazz/pull/33).

- Replaced the invalid Schema.org `Cafe` type with `CafeOrCoffeeShop`, retaining `Store`. Added one stable business identifier for other markup to reference. Existing address, phone and Tuesday–Sunday 14:00–20:00 hours remain consistent.
- Removed nested Product/Offer markup from the multi-product shop overview. It now describes links with an ItemList. Google's product rich results require pages focused on one product.
- Server-rendered individual product details, with their own canonical URL, title and description. Previously these pages initially showed only a loading screen and inherited the shop overview canonical. The visible price, stock state and markup now use the same fresh public API response.
- Added Product/Offer markup to seven reviewed ordinary merchandise items: wooden board game, hand fan, coaster, coffee bottle, T-shirt, umbrella and coffee beans. Currency remains USD, matching the existing storefront; no catalogue prices were changed. Smoking accessories remain visible without shopping markup. This is an eligibility-conscious selection, not a guarantee that Google will show rich results.
- Moved recurring quiz Event markup onto unique public pages: `/quiz-sessions/YYYY-MM-DD/`. Each date has a Bangkok start of 16:20, free admission in THB, full venue address, organizer and its own canonical URL. The multi-date events overview now uses an ItemList of links. No booking or payment flow was changed.
- Corrected the events page and metadata: the free Saturday quiz at 4:20 pm is weekly; live music and DJ sessions are occasional. PR #32 was closed as superseded by this change.
- Added product detail URLs and the next four quiz dates to the sitemap source. No AI-only file or paid optimization service is needed.
- Escaped database text when embedding the new JSON-LD, preventing text from closing a script element.

## Verification

The preview and production builds passed. Three regression tests passed: product price/currency/stock and eligibility semantics; distinct Saturday URLs, Bangkok dates, free offers and valid address; JSON-LD escaping. TypeScript syntax checks passed. The repository's existing build configuration skips full type-checking and linting; those are not claimed as passing.

Live browser checks verified all seven eligible product pages, a smoking-accessory page without Product markup, the events overview, and all four quiz pages for 10, 17, 24 and 31 October 2026. Each detail page had its own correct canonical URL. The coffee product showed $17.00 and In Stock, matching its Offer. The event overview had ItemList and BreadcrumbList markup rather than four Event objects sharing a URL. The business type correction was visible in live JSON-LD.

A final visual check found the new quiz page duplicated the contact section already supplied by the global footer; the follow-up removes that extra copy.

Google's public Rich Results Test returned **“Something went wrong — Log in and try again.”** The authenticated Search Console account is not accessible in this browser. Therefore no Google validation pass, cleared alert, indexed-page count or ranking improvement is claimed. The sitemap XML also could not be inspected live: browser navigation returned `ERR_BLOCKED_BY_CLIENT`, while the other fetch channels could not retrieve it. Sitemap additions were verified in deployed source, not by a live XML fetch.

Shipping and return policies, ratings, reviews and performers were not invented to remove optional warnings. Google's rich-result eligibility and eventual display remain its decision.

## Backlinks: what actually links to the site

The table records page DOM link targets and attributes checked on 5 October, rather than treating every brand mention as a backlink. Repeated links from one publication are one referring domain, not five separate referring domains.

| Source | Observed link status | Practical interpretation |
| --- | --- | --- |
| [Highways.travel](https://highways.travel/grandparents-get-free-cake-for-life-at-this-coffee-and-cannabis-cafe/) | Five ordinary HTML links: three to the homepage, one to `/events/`, one to `/visit/`. `rel` contains `noreferrer noopener`, without `nofollow`, `sponsored` or `ugc`. | Confirmed editorial links from one referring domain. Destinations load. The article still describes older opening hours, although it links to the current visit page. |
| [Wanderlog](https://wanderlog.com/place/details/8907976/grandma-jazz-cannabis--weed-cafe) | Four rendered homepage anchors, each with `rel="noopener"`; no nofollow attribute observed. | Confirmed directory links from one domain. Its description still promotes Saturday live jazz and should reflect the weekly quiz instead. |
| [Restaurant Guru](https://restaurantguru.com/Grandma-Jazz-Kammala) | Website anchor uses a tracking redirect and `rel="nofollow"`. Following it reached the live homepage with `utm_source=restaurantguru&utm_medium=referral`. | Working visitor/referral link. Do not count it as a guaranteed ranking endorsement. Its local-business JSON-LD incorrectly lists Monday 14:00–20:00. |
| [High Times](https://hightimes.com/dispensaries/grandma-jazz-worlds-first-plastic-free-dispensary/) | Article loaded; no HTML anchor to grandmajazz.com or grandmajazz.store found. | Valuable coverage and brand mention, but no confirmed website backlink. A website-link request is a sensible free follow-up. |
| [Head Magazine](https://headmagazine.com/the-quiet-revolution-of-grandma-jazz/) | Article loaded; no HTML anchor to either Grandma Jazz domain found. | Brand coverage without a confirmed website backlink. It also describes older weekly music programming. |
| [The Phuket News](https://www.thephuketnews.com/the-small-community-cafe-on-a-hill-that-brings-the-jazz-101175.php) | Only a `mailto:grandma@grandmajazz.com` link was found for the domain; no website anchor. | The email link is not a website backlink. The article correctly mentions the weekly Saturday quiz. |
| [Weed.th](https://weed.th/shop/8b4a2dd0-a9da-402c-ab8f-3e89fb4d0290/phuket/grandma-jazz) | A JavaScript Website control is displayed, but no crawlable website anchor was found. Clicking its label did not produce a verified destination. | Website action remains unverified; do not count it as a confirmed SEO backlink. Public hours remain stale: Tue–Fri 10:00–20:00, Sat 16:20–23:00, and midnight entries for Mon/Sun. |
| [HighThailand](https://www.highthailand.com/dispensaries/listing/grandma-jazz-cannabis-cafe/) | Listing loaded, but no website anchor to either domain found. | Directory mention without a confirmed website backlink. The listing has older hours. |
| [Skunk Global](https://skunkglobalmarijuanaculture.com/cannabis-world-news/grandma-jazz-a-legacy-continued/) | Search retrieves the article, but this browser reaches an age-verification page. | Backlink status unconfirmed; the age gate was not submitted. |

### Are backlinks working for us?

Three referring domains above have confirmed working website links; two have ordinary anchors without nofollow. This supports discovery and gives visitors routes to the site. The audit cannot assign rankings, traffic or sales to those links. That requires the actual Search Console Links export and referral analytics, neither available here. The public sample is not a complete inventory of Google's known backlinks.

No paid link acquisition, bulk directory submission or disavow action was taken. There is no evidence here that would justify disavowing links.

## Free next actions

1. Ask High Times, Head Magazine and The Phuket News to add the website or visit-page link to their existing coverage. This is link reclamation from genuine relationships. No messages have been sent.
2. Correct Weed.th hours, Restaurant Guru's Monday hours and Wanderlog's weekly-music description through owner/support workflows. Highways and Head need factual schedule updates. These external edits were not submitted during this website audit.
3. When authenticated Google access is available, inspect the live shop, one eligible product and one quiz-date page, run the relevant validation workflow, and export Search Console's external links report. Preserve the export date; it is Google's discovered sample, not a live exhaustive web crawl.
4. Measure referral visits and useful actions (directions, contact, purchase) before claiming a backlink ROI. Restaurant Guru already supplies recognizable UTM attribution on its website link. Do not add query parameters to editorial canonical URLs just to track them.

## Local and AI discovery

Google states that normal SEO fundamentals apply to AI Overviews and AI Mode: crawlable and indexed pages, useful visible text, internal links, accurate structured data and up-to-date Business Profile details. It does not require special AI schema or machine-readable AI files. The work above addresses those fundamentals without buying another service. It does not guarantee placement in ChatGPT, Perplexity, Google AI features or local Maps results.

Technical references: [Google product/merchant guidance](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing), [Google event guidance](https://developers.google.com/search/docs/appearance/structured-data/event), [Schema.org café type](https://schema.org/CafeOrCoffeeShop), [Google AI features guidance](https://developers.google.com/search/docs/appearance/ai-features).
