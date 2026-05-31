import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import path from 'path';
import { fileURLToPath } from 'url';
import { startWhatsAppBot } from './whatsapp-bot.js';
import { readCurrentSetlist, writeCurrentSetlist, buildGigFolder } from './drive.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SETLIST_PARSE_PROMPT = `You are parsing a WhatsApp message from a Musical Director into a structured setlist.
Return ONLY valid JSON with no markdown, no explanation:
{
  "gigName": string | null,
  "gigDate": string | null,
  "sets": [
    {
      "label": string,
      "songs": [
        { "position": number, "title": string, "notes": string | null }
      ]
    }
  ]
}

Rules:
- Preserve the numbered order exactly as written
- Group songs into sets based on any "SET 1 / SET 2 / BREAK" labels; if none, use a single set with label "SET"
- Capture any inline note on a song in the notes field, otherwise notes is null
- gigDate should be ISO format (YYYY-MM-DD) if a date is mentioned, otherwise null
- gigName should be a venue or event name if mentioned, otherwise null
- Do not infer or add keys, tempos, or any information not present in the message
- Ignore greetings, sign-offs, and emoji`;

function allSongTitles(sets: { songs: { title: string }[] }[]): string[] {
  return sets.flatMap(s => s.songs.map(song => song.title));
}

async function triggerGigFolder(
  gigName: string | null,
  gigDate: string | null,
  sets: { songs: { title: string }[] }[]
): Promise<void> {
  const titles = allSongTitles(sets);
  if (titles.length === 0) return;
  try {
    const result = await buildGigFolder(gigName, gigDate, titles);
    const current = await readCurrentSetlist() as Record<string, unknown> | null;
    if (current) {
      await writeCurrentSetlist({ ...current, gig_folder_url: result.folderUrl });
    }
  } catch (err) {
    console.error('[server] buildGigFolder failed:', err);
  }
}

async function parseAndPublish(text: string): Promise<void> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SETLIST_PARSE_PROMPT,
    messages: [{ role: 'user', content: text }],
  });
  const raw = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in Claude response');
  const parsed = JSON.parse(jsonMatch[0]);

  await writeCurrentSetlist({
    gig_name: parsed.gigName ?? null,
    gig_date: parsed.gigDate ?? null,
    raw_text: text,
    sets: parsed.sets ?? [],
    created_at: new Date().toISOString(),
    gig_folder_url: null,
  });

  triggerGigFolder(parsed.gigName ?? null, parsed.gigDate ?? null, parsed.sets ?? []);
}

app.post('/api/setlist-parse', async (req, res) => {
  const { text } = req.body as { text?: string };
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Missing text' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SETLIST_PARSE_PROMPT,
      messages: [{ role: 'user', content: text }],
    });
    const raw = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in Claude response');
    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error('[setlist-parse] Error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

app.get('/api/setlist', async (_req, res) => {
  try {
    const data = await readCurrentSetlist();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

app.post('/api/setlist', async (req, res) => {
  const passphrase = process.env.SETLIST_PASSPHRASE;
  if (passphrase && req.headers['x-setlist-passphrase'] !== passphrase) {
    return res.status(403).json({ error: 'Invalid passphrase' });
  }
  const { gigName, gigDate, rawText, sets } = req.body as {
    gigName?: string; gigDate?: string; rawText?: string; sets?: unknown;
  };
  if (!rawText || !sets) return res.status(400).json({ error: 'Missing rawText or sets' });
  try {
    const record = {
      gig_name: gigName ?? null,
      gig_date: gigDate ?? null,
      raw_text: rawText,
      sets,
      created_at: new Date().toISOString(),
      gig_folder_url: null,
    };
    await writeCurrentSetlist(record);
    triggerGigFolder(
      gigName ?? null,
      gigDate ?? null,
      (sets as { songs: { title: string }[] }[]) ?? []
    );
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

const distPath = process.env.DIST_DIR ?? path.join(__dirname, '../../dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`);
  startWhatsAppBot(parseAndPublish).catch(err =>
    console.error('[whatsapp] Failed to start bot:', err)
  );
});
