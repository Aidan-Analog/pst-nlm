# blasta brass. — Redesign Mockup

This is a **static HTML/CSS/JS design mockup** of a redesigned home page for
the Blasta Brass band site, built from the band's real design system handoff
(colors, type, logo, and component specs — see `assets/` and `styles.css`).
It is **not** connected to Shopify, has no real backend, and is not wired
into the rest of this repository (which is an unrelated internal app).

## Design system source

Built from the "Blasta Brass Design System" handoff:

- **Colors & type tokens** — `styles.css` (`:root` block) mirrors the
  official `colors_and_type.css` export: brand pink `#D929AA`, brand blue
  `#0597F2`, deep navy `#031048`, deep purple `#4A1259`, plus the full
  spacing/radius/shadow scale.
- **Fonts** — `Kitora Demo` (display/wordmark), `DM Sans` (body/UI), and
  `Caveat` (script tagline, loaded from Google Fonts). Self-hosted files
  live in `assets/fonts/`.
- **Logo** — real SVG/PNG lockups in `assets/logos/` (`Blasta-pnk-horiz.svg`
  for light backgrounds, `Blasta-hor-wht.svg` for dark, `bb-icon.png` for
  the favicon/circular badge).
- **Voice & tone** — lowercase brand name (`blasta brass.`), casual/cheeky
  copy, first-person plural ("we"), tagline *"nice to smell ya."*, per the
  brand's content guidelines.
- **Background pattern** — the brand's signature angular "stave" motif is
  approximated with a lightweight CSS `repeating-linear-gradient` (see
  `.stave-pattern` in `styles.css`) rather than embedding the multi-MB
  raster backdrop, to keep this mockup's footprint small. The original
  raster pattern (`Blasta-backdrop-v2.png` / `.jpg`) is available from the
  design system export if you want the exact texture in production.

Placeholder gig dates, venues, and merch prices are still placeholders —
only the *brand* (colors/type/logo/voice) is real. Everything marked with a
`placeholder-note` or the banner at the top of the page needs real content
before launch.

## Viewing it

Open `index.html` directly in a browser, or serve the folder locally:

```bash
npx serve band-site-redesign
```

## What to replace before launch

- **Band photos** — `.photo-frame` in the About section (currently a
  gradient placeholder card in `styles.css`).
- **Copy** — gig list (`GIGS` array in `script.js`), merch products
  (`PRODUCTS` array in `script.js`), contact email/phone/social links in
  `index.html`.
- **Real brand assets**, if they differ from this handoff — swap the files
  in `assets/fonts/` and `assets/logos/`, and the tokens in `styles.css`.

## Porting this into a real Shopify theme

Each `<section id="...">` in `index.html` maps cleanly onto a Shopify
theme section:

| Mockup section | Shopify equivalent |
| --- | --- |
| `#hero` | A custom Liquid section (`sections/hero.liquid`) with theme-editor settings for heading, tagline, and button text/links. The `.stave-pattern` CSS class can be reused as-is. |
| `#about` | A static content section with an `image` setting and `richtext` field for the bio, plus a genre-badge list setting. |
| `#gigs` | A metaobject-driven list (or a booking/ticketing app block) rendered with `{% for %}` in place of the static `GIGS` array. The filter chips can drive a client-side or Shopify Search & Discovery filter. |
| `#merch` | Replace the static `PRODUCTS` array/cards with `{% for product in collection.products %}`, using real product images, `{{ product.price | money }}`, and a working `product-form` for "Add to Cart". |
| `#contact` | Shopify's built-in contact form Liquid snippet (`{% form 'contact' %}`), which posts to Shopify natively — no custom backend needed. |

The design tokens in `styles.css` (`:root` block) match the official design
system export almost 1:1, so they can be copied directly into a theme's
`settings_schema.json` / CSS custom properties for the theme editor. Font
files in `assets/fonts/` and logo files in `assets/logos/` can be uploaded
as-is to a theme's `assets/` folder.
