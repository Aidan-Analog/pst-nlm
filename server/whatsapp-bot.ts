import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  isJidGroup,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { mkdirSync } from 'fs';
import P from 'pino';

function looksLikeSetlist(text: string): boolean {
  const numbered = text.split('\n').filter(l => /^\d+[\.\)]\s+\S/.test(l.trim()));
  return numbered.length >= 3;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractText(m: any): string {
  return (
    m?.conversation ||
    m?.extendedTextMessage?.text ||
    m?.ephemeralMessage?.message?.conversation ||
    m?.ephemeralMessage?.message?.extendedTextMessage?.text ||
    ''
  );
}

export async function startWhatsAppBot(
  parseAndPublish: (text: string) => Promise<void>
): Promise<void> {
  if (process.env.WHATSAPP_ENABLED !== 'true') return;

  const mdNumber = process.env.WHATSAPP_MD_NUMBER;
  const groupName = process.env.WHATSAPP_GROUP_NAME;

  if (!mdNumber || !groupName) {
    console.error('[whatsapp] WHATSAPP_MD_NUMBER and WHATSAPP_GROUP_NAME must be set');
    return;
  }

  const sessionDir = process.env.WHATSAPP_SESSION_DIR ?? './data/wa-session';
  mkdirSync(sessionDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  let targetGroupJid: string | null = null;
  let reconnecting = false;

  function connect() {
    const sock = makeWASocket({
      version,
      auth: state,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      logger: P({ level: 'silent' }) as any,
      printQRInTerminal: false,
      syncFullHistory: false,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // Request a pairing code the first time a QR is generated (headless-friendly)
      if (qr) {
        try {
          const code = await sock.requestPairingCode(mdNumber!);
          console.log(`[whatsapp] Pairing code for ${mdNumber}: ${code}`);
          console.log('[whatsapp] On your phone: WhatsApp → Settings → Linked Devices → Link a Device → Link with phone number');
        } catch {
          // Falls back to QR scan if pairing code isn't available yet
        }
      }

      if (connection === 'open') {
        console.log('[whatsapp] Connected. Looking up group...');
        reconnecting = false;

        try {
          const groups = await sock.groupFetchAllParticipating();
          const match = Object.entries(groups).find(([, meta]) => meta.subject === groupName);
          if (match) {
            targetGroupJid = match[0];
            console.log(`[whatsapp] Monitoring "${groupName}"`);
          } else {
            const available = Object.values(groups).map(g => `"${g.subject}"`).join(', ');
            console.warn(`[whatsapp] Group "${groupName}" not found. Available: ${available}`);
          }
        } catch (err) {
          console.error('[whatsapp] Could not fetch groups:', err);
        }
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`[whatsapp] Disconnected (${statusCode}). Reconnect: ${shouldReconnect}`);
        if (shouldReconnect && !reconnecting) {
          reconnecting = true;
          setTimeout(connect, 5000);
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        if (!isJidGroup(msg.key.remoteJid ?? '')) continue;
        if (targetGroupJid && msg.key.remoteJid !== targetGroupJid) continue;

        const senderJid = msg.key.participant ?? '';
        if (!senderJid.startsWith(mdNumber!)) continue;

        const text = extractText(msg.message);
        if (!text || !looksLikeSetlist(text)) continue;

        console.log('[whatsapp] Setlist detected — parsing...');
        try {
          await parseAndPublish(text);

          const url = process.env.WHATSAPP_SETLIST_URL ?? '/setlist';
          await sock.sendMessage(
            msg.key.remoteJid!,
            { text: `✅ Setlist published! View at ${url}` },
            { quoted: msg }
          );
          console.log('[whatsapp] Setlist published, reply sent.');
        } catch (err) {
          console.error('[whatsapp] Parse/publish error:', err);
        }
      }
    });
  }

  connect();
}
