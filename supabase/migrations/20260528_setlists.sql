CREATE TABLE setlists (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  timestamptz DEFAULT now(),
  gig_name    text,
  gig_date    date,
  raw_text    text NOT NULL,
  sets        jsonb NOT NULL DEFAULT '[]'
);

-- Allow public read and insert (band internal tool, no auth required)
ALTER TABLE setlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON setlists
  FOR SELECT USING (true);

CREATE POLICY "Public insert" ON setlists
  FOR INSERT WITH CHECK (true);
