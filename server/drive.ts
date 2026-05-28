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

// Map the raw instrument name from the filename to a clean gig-subfolder name
function instrumentToFolder(raw: string): string {
  const s = raw.toLowerCase().replace(/[()♭]/g, '').replace(/\s+/g, ' ').trim();
  if (s.includes('trumpet'))                                      return 'Trumpet';
  if (s === 'alto saxophone' || s.includes('alto sax'))          return 'Alto Sax';
  if (s === 'tenor saxophone' || s.includes('tenor sax'))        return 'Tenor Sax';
  if (s === 'baritone saxophone' || s.includes('baritone sax') || s.includes('bari sax')) return 'Baritone Sax';
  if (s === 'trombone 2' || s.includes('trombone 2'))            return 'Trombone 2';
  if (s === 'trombone 1' || s.includes('trombone 1') || s === 'trombone') return 'Trombone 1';
  if (s.includes('tuba'))                                        return 'Tuba';
  if (s.includes('drum') || s.includes('percussion'))            return 'Percussion';
  if (s.includes('bass guitar') || s.includes('bass gtr'))       return 'Bass Guitar';
  if (s.includes('euphonium'))                                   return 'Euphonium';
  if (s.includes('keyboard') || s.includes('keys'))             return 'Keys';
  return raw; // fallback: keep raw name
}

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

    // Fuzzy fallback: check if folder name contains the song title or vice versa
    if (!folder) {
      for (const [fKey, fData] of songFolderMap) {
        if (fKey.includes(key) || key.includes(fKey)) { folder = fData; break; }
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

  // 5. Create instrument subfolders and copy the PDFs in
  for (const [instrumentName, files] of instrumentFiles) {
    const subfolderRes = await drive.files.create({
      requestBody: {
        name: instrumentName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [gigFolderId],
      },
      fields: 'id',
    });
    const subfolderId = subfolderRes.data.id!;

    for (const { fileId, filename } of files) {
      try {
        await drive.files.copy({
          fileId,
          requestBody: { name: filename, parents: [subfolderId] },
          fields: 'id',
        });
      } catch (err) {
        console.error(`[drive] Could not copy "${filename}":`, (err as Error).message);
      }
    }
  }

  if (unmatched.length > 0) {
    console.warn('[drive] Songs not found in Drive:', unmatched.join(', '));
  }
  console.log(`[drive] Gig folder created: ${folderUrl} (${matched.length} songs, ${instrumentFiles.size} instruments)`);

  return { folderUrl, matched, unmatched };
}
