import { Router } from 'express';
import { google } from 'googleapis';

const router = Router();

function getSheetsClient() {
  const credJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!credJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set');
  const credentials = JSON.parse(credJson) as object;
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

router.post('/submit', async (req, res) => {
  const sheetId = process.env.GOOGLE_SHEETS_ID;
  if (!sheetId) {
    return res.status(503).json({ error: 'GOOGLE_SHEETS_ID not configured' });
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return res.status(503).json({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON not configured' });
  }

  const {
    housework = '',
    work = '',
    otherChores = '',
    notes = '',
  } = req.body as Record<string, string>;

  const row = [
    new Date().toISOString(),
    housework,
    work,
    otherChores,
    typeof notes === 'string' ? notes.trim() : '',
  ];

  try {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: process.env.GOOGLE_SHEETS_RANGE ?? 'Sheet1!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });
    res.json({ success: true });
  } catch (err) {
    console.error('[tracker] Sheets error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

export default router;
