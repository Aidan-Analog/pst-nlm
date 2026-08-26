# Walkthrough Generator

Turns an auctioneer's own listing photos into a polished walkthrough video —
Ken Burns pan/zoom on each photo, crossfades between rooms, optional
background music and address/room-label overlays. No videographer or
specialist camera equipment needed.

This is a standalone app inside the `pst-nlm` repo, independent of the
sibling ADI product-search app at the repo root (own frontend, backend,
dependencies, and deployment). **Photos must be uploaded by the person using
this tool — the tool never fetches photos from a third-party site.** See the
top-level plan / PR description for why that boundary matters.

## Why Docker, not Vercel

FFmpeg rendering needs an always-on process with persistent disk and no hard
execution-time ceiling. Vercel serverless functions give ephemeral `/tmp`
only, no bundled ffmpeg, and tight duration limits — none of which fit a
render that can run for a minute or more. This app always runs as a
long-running Docker container (mirroring the pattern the root `Dockerfile` +
`server/index.ts` already use in this repo), never as a Vercel function.

## Local development

Requires Node 22+ and, ideally, a system `ffmpeg`/`ffprobe` (falls back to
the bundled `ffmpeg-static` devDependency if you don't have one installed).

```bash
npm run install:all   # installs client/ and server/ independently
npm run dev            # starts the Vite client (5174) and Express API (4001)
```

Open http://localhost:5174. The client proxies `/api`, `/media`, and
`/media-assets` to the server (see `client/vite.config.ts`).

Add background music by dropping licensed `.mp3` files into
`assets/music/` — see `assets/music/README.md`. The app ships with no
bundled tracks so it never makes an unverified licensing claim on your
behalf.

## Running the server's unit tests

The trickiest part of this feature is the ffmpeg crossfade offset/duration
math in `server/src/services/ffmpeg/buildFilterGraph.ts` — it's a pure
function, so it's covered by `node --test` without invoking ffmpeg:

```bash
npm run test:server
```

## Docker

```bash
docker compose up --build
```

Serves the built client and API together on http://localhost:4001, with
uploads/renders persisted to a named volume and `assets/music` bind-mounted
so you can drop tracks in without rebuilding the image.

## Architecture

See the repo's plan document (or ask for a summary) for the full design —
in short: React 19 + Vite + Tailwind client, Express 5 + better-sqlite3 +
multer + sharp + raw ffmpeg `child_process` server, a single in-process
render queue (concurrency 1), and local disk storage behind a narrow
`StorageAdapter` seam so swapping in S3/Supabase Storage later doesn't touch
route or service code.

## Known v1 limitations (by design — see phasing in the plan)

- One fixed Ken Burns style, one crossfade transition, one 1920x1080 output.
- Photo ordering is manual only — no automatic room-detection/sequencing.
- No auth/multi-tenancy — this is a single-operator prototype.
- No durable external job queue — an in-flight render is lost (and marked
  failed) if the server restarts mid-render.
