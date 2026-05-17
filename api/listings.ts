import * as cheerio from 'cheerio';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// ── Types ──────────────────────────────────────────────────────────────────

interface Program {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  durationMinutes: number | null;
  description: string;
  isNow: boolean;
  genre: string;
}

interface ChannelInfo {
  slug: string;
  name: string;
  programs: Program[];
  error?: string;
}

interface ListingsResponse {
  channels: ChannelInfo[];
  fetchedAt: string;
  date: string;
}

// ── Channel registry ───────────────────────────────────────────────────────

const CHANNELS: Record<string, string> = {
  'rte-one':              'RTÉ One',
  'rte-two':              'RTÉ Two',
  'virgin-media-one':     'Virgin Media One',
  'virgin-media-two':     'Virgin Media Two',
  'virgin-media-three':   'Virgin Media Three',
  'tg4':                  'TG4',
  'bbc-one':              'BBC One NI',
  'bbc-two':              'BBC Two',
  'itv':                  'ITV',
  'channel-4':            'Channel 4',
  'channel-5':            'Channel 5',
  'sky-news':             'Sky News',
};

const BASE_URL = 'https://www.entertainment.ie/tv';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ── Warm cache (lives as long as the function instance is hot) ─────────────

const cache = new Map<string, { data: ChannelInfo; fetchedAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── Scraper ────────────────────────────────────────────────────────────────

function normaliseTime(raw: string): string {
  const cleaned = raw.replace(/[^\d:apm ]/gi, '').trim();

  // Already HH:MM or H:MM
  if (/^\d{1,2}:\d{2}$/.test(cleaned)) {
    const [h, m] = cleaned.split(':').map(Number);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // 12-hour format "7:30pm" / "07:30 PM"
  const match = cleaned.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const period = match[3].toLowerCase();
    if (period === 'pm' && h !== 12) h += 12;
    if (period === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  return cleaned || '00:00';
}

function timeDiffMinutes(start: string, end: string): number | null {
  const parse = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return isNaN(h) || isNaN(m) ? null : h * 60 + m;
  };
  const s = parse(start);
  const e = parse(end);
  if (s === null || e === null) return null;
  const diff = e >= s ? e - s : 24 * 60 - s + e; // handle overnight wrap
  return diff > 0 ? diff : null;
}

function parsePrograms(html: string, slug: string): Program[] {
  const $ = cheerio.load(html);
  const programs: Program[] = [];

  // Ordered selector fallbacks for Entertainment.ie's HTML structure
  const SELECTORS = [
    '.tv-listing__item',
    '.listing-item',
    '[data-programme]',
    '.tv-guide__item',
    '.schedule-item',
    '.program-item',
    'li.listing',
  ];

  let items = $('');
  for (const sel of SELECTORS) {
    const found = $(sel);
    if (found.length > 0) {
      items = found;
      break;
    }
  }

  items.each((i, el) => {
    const $el = $(el);

    // Time: prefer datetime attr on <time>, fallback to text content
    const timeRaw =
      $el.find('time').first().attr('datetime') ||
      $el.find('time').first().text().trim() ||
      $el.find('.time, [class*="time"]').first().text().trim() ||
      $el.find('[class*="start"]').first().text().trim();

    const title =
      $el.find('h3, h4').first().text().trim() ||
      $el.find('.title, [class*="title"]').first().text().trim() ||
      $el.find('a').first().text().trim();

    if (!title) return;

    const description = $el.find('.synopsis, .description, p').first().text().trim();
    const genre = $el.find('.genre, [class*="genre"]').first().text().trim();
    const isNow =
      $el.hasClass('is-now') ||
      $el.hasClass('now') ||
      $el.hasClass('current') ||
      $el.hasClass('active') ||
      $el.find('.now, .is-now, .on-now').length > 0;

    const startTime = normaliseTime(timeRaw);

    programs.push({
      id: `${slug}-${startTime.replace(':', '')}-${i}`,
      title,
      startTime,
      endTime: '',
      durationMinutes: null,
      description,
      isNow,
      genre,
    });
  });

  // Post-pass: derive endTime and duration from adjacent starts
  for (let i = 0; i < programs.length - 1; i++) {
    programs[i].endTime = programs[i + 1].startTime;
    programs[i].durationMinutes = timeDiffMinutes(programs[i].startTime, programs[i + 1].startTime);
  }

  return programs;
}

async function scrapeChannel(slug: string, date: string): Promise<ChannelInfo> {
  const cacheKey = `${slug}:${date}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data;
  }

  const url =
    date === 'today' || date === ''
      ? `${BASE_URL}/${slug}/`
      : `${BASE_URL}/${slug}/?date=${encodeURIComponent(date)}`;

  const resp = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
    signal: AbortSignal.timeout(8000),
  });

  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} fetching ${slug}`);
  }

  const html = await resp.text();
  const programs = parsePrograms(html, slug);

  const data: ChannelInfo = {
    slug,
    name: CHANNELS[slug] ?? slug,
    programs,
  };

  cache.set(cacheKey, { data, fetchedAt: Date.now() });
  return data;
}

// ── Vercel handler ─────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const date = (typeof req.query.date === 'string' ? req.query.date : 'today') || 'today';
  const channelParam = typeof req.query.channel === 'string' ? req.query.channel : '';

  const slugs = channelParam
    ? channelParam.split(',').map((s) => s.trim()).filter(Boolean)
    : Object.keys(CHANNELS);

  // Validate slugs
  const unknown = slugs.filter((s) => !CHANNELS[s]);
  if (unknown.length > 0) {
    return res.status(400).json({ error: `Unknown channel slug(s): ${unknown.join(', ')}` });
  }

  const results = await Promise.allSettled(slugs.map((slug) => scrapeChannel(slug, date)));

  const channels: ChannelInfo[] = results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return {
      slug: slugs[i],
      name: CHANNELS[slugs[i]] ?? slugs[i],
      programs: [],
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
    };
  });

  const body: ListingsResponse = {
    channels,
    fetchedAt: new Date().toISOString(),
    date,
  };

  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
  return res.status(200).json(body);
}
