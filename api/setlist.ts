import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

function getClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('setlists')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
    }

    return res.json(data ?? null);
  }

  if (req.method === 'POST') {
    const passphrase = process.env.SETLIST_PASSPHRASE;
    if (passphrase) {
      const provided = req.headers['x-setlist-passphrase'];
      if (provided !== passphrase) {
        return res.status(403).json({ error: 'Invalid passphrase' });
      }
    }

    const { gigName, gigDate, rawText, sets } = req.body as {
      gigName?: string;
      gigDate?: string;
      rawText?: string;
      sets?: unknown;
    };

    if (!rawText || !sets) {
      return res.status(400).json({ error: 'Missing rawText or sets' });
    }

    const supabase = getClient();
    const { data, error } = await supabase
      .from('setlists')
      .insert({
        gig_name: gigName ?? null,
        gig_date: gigDate ?? null,
        raw_text: rawText,
        sets,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(data);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
