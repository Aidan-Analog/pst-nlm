export interface Song {
  position: number;
  title: string;
  notes: string | null;
}

export interface SetGroup {
  label: string;
  songs: Song[];
}

export interface Setlist {
  created_at: string;
  gig_name: string | null;
  gig_date: string | null;
  raw_text: string;
  sets: SetGroup[];
}

export interface ParsedSetlist {
  gigName: string | null;
  gigDate: string | null;
  sets: SetGroup[];
}
