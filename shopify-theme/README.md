# blasta brass. — Shopify Theme

A complete, installable Shopify (Online Store 2.0) theme for the band, built
from the real Blasta Brass design system handoff — real colors, fonts, logo,
and voice. This is the deliverable version of the `band-site-redesign/`
mockup elsewhere in this repo, turned into actual Liquid theme files you can
upload to a Shopify store.

**Validated with `shopify theme check` — 33 files, zero errors, zero
warnings.**

## What's in the box

```
layout/theme.liquid          Site-wide shell (head, header, footer, scripts)
templates/                   One JSON (or .liquid) file per page type
sections/                    Every section, including the 5 homepage ones
snippets/product-card.liquid Shared product card (used by Merch + Collection)
assets/                      Self-hosted fonts, logos, theme.css, theme.js
config/                      Theme settings (contact info, social links)
locales/en.default.json      Minimal locale file (see note below)
```

Homepage (`templates/index.json`) sections, in order:

1. **hero** — headline, script tagline, CTAs, stave-pattern background
2. **about** — bio (richtext, editable in theme editor) + genre badges (blocks)
3. **gigs** — one repeatable **block per gig** (date, venue, badge, card
   color, filter tag) + auto-generated filter chips
4. **merch** — pick a real collection in the theme editor; renders a live
   product grid with working "add to cart"
5. **contact** — Shopify's native contact form (submissions land in
   Shopify Admin → Inbox), plus email/phone/social pulled from theme settings

Every other required Shopify template is also implemented and styled to
match — product, collection, cart, page, blog, article, search, 404,
list-collections, gift card, and the password (coming-soon) page — so this
is a genuinely complete, uploadable theme, not just a homepage.

## How to install

**Option A — Upload as a zip (fastest, no CLI needed)**

1. Zip the **contents** of this `shopify-theme/` folder (not the folder
   itself — `layout/`, `sections/`, etc. must be at the top level of the
   zip).
   ```bash
   cd shopify-theme
   zip -r ../blasta-brass-theme.zip . -x ".*"
   ```
2. In Shopify Admin, go to **Online Store → Themes**.
3. Click **Add theme → Upload zip file**, and select `blasta-brass-theme.zip`.
4. Once uploaded, click **Customize** to preview, or **Publish** to make it
   live.

**Option B — Shopify CLI (recommended for ongoing development)**

```bash
npm install -g @shopify/cli
cd shopify-theme
shopify theme dev          # live local preview against your store
shopify theme push         # push to a theme on your store
```

## What you need to do before launch

- **Merch section**: open the theme editor → Merch section → pick a real
  **Collection**. Until you do, it shows a placeholder message instead of
  products.
- **Gigs**: open the theme editor → Gigs section → edit/add/remove the gig
  blocks with real dates, venues, and ticket links.
- **About**: swap the placeholder bio and add a real band photo (both
  editable directly in the theme editor — no code needed).
- **Contact info**: Theme settings (gear icon, bottom of the section list in
  the editor) → set your real contact email, phone, and social links.
- **Navigation**: this theme uses Shopify's standard navigation menus
  (Online Store → Navigation). Set up a `main-menu` (header) and `footer`
  menu with your real pages — the header/footer sections pull from these
  automatically instead of hardcoded links, so they work correctly once you
  leave the homepage.
- **Logo**: header section has a logo image picker; it falls back to the
  bundled pink logo (`assets/logo-pink-horiz.svg`) if you don't set one.

## Design system fidelity

Colors, spacing, radius, and shadow tokens in `assets/theme.css` mirror the
official `colors_and_type.css` export almost 1:1. Fonts:

- **Kitora** (display/wordmark) — self-hosted OTF
- **DM Sans** (body/UI) — self-hosted variable TTF
- **Caveat** (script tagline) — self-hosted WOFF2 (downloaded from Google
  Fonts and self-hosted here so the theme has zero external CDN
  dependencies and passes `theme theme-check` with no warnings)

## Known simplifications / things to know

- **Customer account pages** (`customers/*.liquid`) are **not** included.
  Most new Shopify stores use Shopify's hosted Customer Accounts (a
  separate, Shopify-managed UI that doesn't need theme templates), so this
  is usually a non-issue — only relevant if you're on "classic" customer
  accounts.
- **Collection filtering/sorting** (Search & Discovery facets) isn't wired
  up on the collection template — it's a plain paginated grid. Straightforward
  to add later via the `main-collection.liquid` section if you need it.
- **Product variant picker** uses a plain `<select>` dropdown rather than
  swatches/pills, so "add to cart" works correctly with zero JavaScript
  variant-matching logic. Upgrading to visual swatches is a pure front-end
  enhancement on top of the same form.
- Copy is hardcoded in English directly in the Liquid files/section
  settings rather than routed through `locales/en.default.json` — this is
  a single-language custom build, so that file exists mainly to satisfy the
  standard theme structure and as a starting point if you ever need
  multi-language support.
- `assets/logo-pink-vert.svg` (vertical logo lockup) is bundled but not
  currently used anywhere — handy to have if you want it for a specific
  section later.
