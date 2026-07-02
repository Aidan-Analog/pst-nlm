# Blastabrass — Redesign Mockup

This is a **static HTML/CSS/JS design mockup** of a redesigned home page for the
Blastabrass band site, built to replace the current basic free-template look.
It is **not** connected to Shopify, has no real backend, and is not wired into
the rest of this repository (which is an unrelated internal app).

## Why this is here

`blastabrass.ie` couldn't be fetched automatically (it returns HTTP 403 to
automated requests), so this mockup uses **placeholder branding, copy, gig
dates, and merch prices** rather than the real site's content. Every
placeholder is marked in the UI with a note or the red banner at the top of
the page — swap these out before this goes anywhere near production.

## Viewing it

Open `index.html` directly in a browser, or serve the folder locally:

```bash
npx serve band-site-redesign
```

## What to replace before launch

- **Band photos** — `.photo-frame` in the About section and the hero
  background (currently a gradient placeholder in `styles.css`).
- **Copy** — bio text, gig list (`GIGS` array in `script.js`), merch products
  (`PRODUCTS` array in `script.js`), contact email/phone/social links in
  `index.html`.
- **Colors/fonts** — CSS custom properties at the top of `styles.css`
  (`--color-brass`, `--font-display`, etc.) if the band has an existing
  brand kit.

## Porting this into a real Shopify theme

This was structured so each `<section id="...">` in `index.html` maps
cleanly onto a Shopify theme section:

| Mockup section | Shopify equivalent |
| --- | --- |
| `#hero` | A custom Liquid section (`sections/hero.liquid`) with theme-editor settings for background image, heading, and button text/links. |
| `#about` | A static content section with an `image` setting and `richtext` field for the bio. |
| `#gigs` | Either a metafield-driven list on the shop's metaobjects, or a small app block if you want a booking/ticketing integration. Replace the static `GIGS` array with a Liquid `{% for %}` loop. |
| `#merch` | Replace the static `PRODUCTS` array/cards with `{% for product in collection.products %}`, using Shopify's real product images, prices (`{{ product.price | money }}`), and a working `product-form` for "Add to Cart". |
| `#contact` | Shopify's built-in contact form Liquid snippet (`{% form 'contact' %}`), which posts to Shopify natively — no custom backend needed. |

The design tokens in `styles.css` (`:root` block) are written so they can be
copied almost directly into a theme's `settings_schema.json` / CSS variables
for the theme editor.
