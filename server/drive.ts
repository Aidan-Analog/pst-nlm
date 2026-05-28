import { google } from 'googleapis';
import { Readable } from 'stream';

const FILENAME = 'setlist-current.json';

function getClient() {
  return google.drive({
    version: 'v3',
    auth: new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    }),
  });
}

function isConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_DRIVE_FOLDER_ID);
}

async function findFileId(drive: ReturnType<typeof getClient>): Promise<string | null> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;
  const res = await drive.files.list({
    q: `name='${FILENAME}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  });
  return res.data.files?.[0]?.id ?? null;
}

export async function readCurrentSetlist(): Promise<object | null> {
  if (!isConfigured()) return null;
  try {
    const drive = getClient();
    const fileId = await findFileId(drive);
    if (!fileId) return null;

    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'json' }
    );
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

  const fileId = await findFileId(drive);
  if (fileId) {
    await drive.files.update({ fileId, media });
  } else {
    await drive.files.create({
      requestBody: { name: FILENAME, parents: [folderId] },
      media,
    });
  }
}
