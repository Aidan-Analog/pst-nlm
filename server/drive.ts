import { google } from 'googleapis';
import { Readable } from 'stream';

const SETLIST_FILENAME = 'setlist-current.json';

// Hardcoded known folder IDs — override via env vars if they change
const DEFAULT_SONGS_FOLDER_ID = '1bSpfacZCukt1hBpCcj5kMCA4BGQL43kx';

function getClient() {
  return google.drive({
    version: 'v3',
    auth: new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      // Full drive scope needed to read files shared by others and copy them
      scopes: ['https://www.googleapis.com/auth/drive'],
    }),
  });
}

function isConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_DRIVE_FOLDER_ID);
}

async function findFileId(drive: ReturnType<typeof getClient>, name: string, parentId: string): Promise<string | null> {
  const res = await drive.files.list({
    q: `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  });
  return res.data.files?.[0]?.id ?? null;
}

// ── Setlist JSON file ────────────────────────────────────────────────────────

export async function readCurrentSetlist(): Promise<object | null> {
  if (!isConfigured()) return null;
  try {
    const drive = getClient();
    const fileId = await findFileId(drive, SETLIST_FILENAME, process.env.GOOGLE_DRIVE_FOLDER_ID!);
    if (!fileId) return null;
    const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'json' });
    return res.data as object;
  } catch (err) {
    console.error('[drive] readCurrentSetlist error:', err);
    return null;
  }
}

export async function writeCurrentSetlist(data: object): Promise<void> {
  if (!isConfigured()) throw new Error('Google Drive env vars not configured');
  const drive = getClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;
  const body = JSON.stringify(data, null, 2);
  const media = { mimeType: 'application/json', body: Readable.from([body]) };
  const fileId = await findFileId(drive, SETLIST_FILENAME, folderId);
  if (fileId) {
    await drive.files.update({ fileId, media });
  } else {
    await drive.files.create({ requestBody: { name: SETLIST_FILENAME, parents: [folderId] }, media });
  }
}

// ── Gig folder builder ───────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j];
      row[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, row[j], row[j - 1]);
      prev = temp;
    }
  }
  return row[b.length];
}

function strSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length, 1);
}

function wordOverlap(a: string, b: string): number {
  const wa = a.split(' ').filter(w => w.length > 1);
  const wb = new Set(b.split(' ').filter(w => w.length > 1));
  if (wa.length === 0) return 0;
  return wa.filter(w => wb.has(w)).length / wa.length;
}

// Extract the instrument name from a PDF filename.
// Handles: "01 - Tuba - Song Name.pdf"  and  "Alto Saxophone - Song Name.pdf"
function extractInstrument(filename: string): string | null {
  const base = filename.replace(/\.[^.]+$/, '');
  const numbered = base.match(/^\d+\s*-\s*(.+?)\s*-\s*.+$/);
  if (numbered) return numbered[1].trim();
  const simple = base.match(/^(.+?)\s*-\s*.+$/);
  if (simple) return simple[1].trim();
  return null;
}

// Map the raw instrument name from the filename to a canonical part name
function instrumentToFolder(raw: string): string {
  const s = raw.toLowerCase().replace(/[()♭]/g, '').replace(/\s+/g, ' ').trim();
  if (s.includes('trumpet 3'))                                              return 'Trumpet 3';
  if (s.includes('trumpet 2'))                                              return 'Trumpet 2';
  if (s.includes('trumpet 1') || s === 'trumpet')                          return 'Trumpet 1';
  if (s === 'alto saxophone' || s.includes('alto sax'))                    return 'Alto Sax';
  if (s === 'tenor saxophone' || s.includes('tenor sax'))                  return 'Tenor Sax';
  if (s === 'baritone saxophone' || s.includes('baritone sax') || s.includes('bari sax')) return 'Baritone Sax';
  if (s === 'trombone 2' || s.includes('trombone 2'))                      return 'Trombone 2';
  if (s === 'trombone 1' || s.includes('trombone 1') || s === 'trombone') return 'Trombone 1';
  if (s.includes('tuba') || s.includes('sousa') || s.includes('sousaphone')) return 'Tuba';
  if (s.includes('drum') || s.includes('percussion'))                      return 'Percussion';
  if (s.includes('bass guitar') || s.includes('bass gtr'))                 return 'Bass Guitar';
  if (s.includes('euphonium'))                                             return 'Euphonium';
  if (s.includes('keyboard') || s.includes('keys'))                       return 'Keys';
  return raw;
}

// Each player mapped to the canonical part name(s) they receive.
// Trombone players get both parts until individual assignments are added.
const PLAYERS: Record<string, string[]> = {
  Benny:    ['Baritone Sax'],
  Ger:      ['Baritone Sax'],
  Danielle: ['Alto Sax'],
  Ken:      ['Alto Sax'],
  Padraig:  ['Tenor Sax'],
  Damien:   ['Trombone 1', 'Trombone 2'],
  Elva:     ['Trombone 1', 'Trombone 2'],
  Cathal:   ['Trombone 1', 'Trombone 2'],
  Gerry:    ['Trumpet 1'],
  Alma:     ['Trumpet 2'],
  Frank:    ['Trumpet 3'],
  Aidan:    ['Percussion'],
  Arnold:   ['Tuba'],
};

export interface GigFolderResult {
  folderUrl: string;
  matched: string[];
  unmatched: string[];
}

export async function buildGigFolder(
  gigName: string | null,
  gigDate: string | null,
  songTitles: string[]
): Promise<GigFolderResult> {
  const drive = getClient();
  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;
  const songsFolderId = process.env.GOOGLE_SONGS_FOLDER_ID ?? DEFAULT_SONGS_FOLDER_ID;

  // 1. Name the gig folder
  let folderName = gigName ?? 'Setlist';
  if (gigDate) {
    try {
      const d = new Date(gigDate + 'T00:00:00');
      const formatted = d.toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' });
      folderName = `${folderName} - ${formatted}`;
    } catch { /* leave as-is */ }
  }

  // 2. Create the gig folder in Drive root
  const gigFolderRes = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId],
    },
    fields: 'id, webViewLink',
  });
  const gigFolderId = gigFolderRes.data.id!;
  const folderUrl = gigFolderRes.data.webViewLink ?? `https://drive.google.com/drive/folders/${gigFolderId}`;

  // 3. Index all song folders from "Music by Song"
  const songFoldersRes = await drive.files.list({
    q: `'${songsFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    pageSize: 200,
  });
  const songFolderMap = new Map(
    (songFoldersRes.data.files ?? []).map(f => [normalize(f.name!), { id: f.id!, name: f.name! }])
  );

  // 4. Match setlist songs → PDFs → instruments
  const instrumentFiles = new Map<string, Array<{ fileId: string; filename: string }>>();
  const matched: string[] = [];
  const unmatched: string[] = [];

  for (const songTitle of songTitles) {
    const key = normalize(songTitle);
    let folder = songFolderMap.get(key);

    // Tier 2: substring containment ("Mustang" → "Mustang Sally")
    if (!folder) {
      for (const [fKey, fData] of songFolderMap) {
        if (fKey.includes(key) || key.includes(fKey)) { folder = fData; break; }
      }
    }

    // Tier 3: word-token overlap (handles shortened/partial titles, word reordering)
    if (!folder) {
      let bestScore = 0;
      let bestData: { id: string; name: string } | undefined;
      for (const [fKey, fData] of songFolderMap) {
        const score = Math.max(wordOverlap(key, fKey), wordOverlap(fKey, key));
        if (score > 0.6 && score > bestScore) { bestScore = score; bestData = fData; }
      }
      if (bestData) {
        console.log(`[drive] word-overlap match: "${songTitle}" → "${bestData.name}" (${bestScore.toFixed(2)})`);
        folder = bestData;
      }
    }

    // Tier 4: Levenshtein similarity (handles typos and spelling errors)
    if (!folder) {
      let bestScore = 0;
      let bestData: { id: string; name: string } | undefined;
      for (const [fKey, fData] of songFolderMap) {
        const score = strSimilarity(key, fKey);
        if (score >= 0.75 && score > bestScore) { bestScore = score; bestData = fData; }
      }
      if (bestData) {
        console.log(`[drive] levenshtein match: "${songTitle}" → "${bestData.name}" (${bestScore.toFixed(2)})`);
        folder = bestData;
      }
    }

    if (!folder) { unmatched.push(songTitle); continue; }
    matched.push(songTitle);

    // List PDFs in this song's folder
    const pdfRes = await drive.files.list({
      q: `'${folder.id}' in parents and mimeType='application/pdf' and trashed=false`,
      fields: 'files(id, name)',
      pageSize: 50,
    });

    for (const pdf of pdfRes.data.files ?? []) {
      const instrument = extractInstrument(pdf.name!);
      if (!instrument) continue;
      const subfolder = instrumentToFolder(instrument);
      if (!instrumentFiles.has(subfolder)) instrumentFiles.set(subfolder, []);
      instrumentFiles.get(subfolder)!.push({ fileId: pdf.id!, filename: pdf.name! });
    }
  }

  // 5. Create a subfolder per player and copy their part's PDFs in
  let playerFolderCount = 0;
  for (const [playerName, parts] of Object.entries(PLAYERS)) {
    const playerFiles = parts.flatMap(p => instrumentFiles.get(p) ?? []);
    if (playerFiles.length === 0) continue;

    const subfolderRes = await drive.files.create({
      requestBody: {
        name: playerName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [gigFolderId],
      },
      fields: 'id',
    });
    const subfolderId = subfolderRes.data.id!;
    playerFolderCount++;

    for (const { fileId, filename } of playerFiles) {
      try {
        await drive.files.copy({
          fileId,
          requestBody: { name: filename, parents: [subfolderId] },
          fields: 'id',
        });
      } catch (err) {
        console.error(`[drive] Could not copy "${filename}" for ${playerName}:`, (err as Error).message);
      }
    }
  }

  if (unmatched.length > 0) {
    console.warn('[drive] Songs not found in Drive:', unmatched.join(', '));
  }
  console.log(`[drive] Gig folder created: ${folderUrl} (${matched.length} songs, ${playerFolderCount} players)`);

  return { folderUrl, matched, unmatched };
}
