import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are parsing a WhatsApp message from a Musical Director into a structured setlist.
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
- Capture any inline note on a song (e.g. "Mustang Sally *request*") in the notes field, otherwise notes is null
- gigDate should be ISO format (YYYY-MM-DD) if a date is mentioned, otherwise null
- gigName should be a venue or event name if mentioned, otherwise null
- Do not infer or add keys, tempos, or any information not present in the message
- Ignore greetings, sign-offs, and emoji`;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: text }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in Claude response');

    const parsed = JSON.parse(jsonMatch[0]);
    res.json(parsed);
  } catch (err) {
    console.error('[setlist-parse] Error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
}
