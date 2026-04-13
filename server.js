const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode');

const app = express();
app.use(express.json());

const TOKEN = process.env.WHATSAPP_TOKEN || 'valten2026';
const PORT  = process.env.PORT || 3000;

let qrCodeData   = null;
let isReady      = false;
let clientStatus = 'initializing';

// â”€â”€ WhatsApp Client â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  }
});

client.on('qr', async (qr) => {
  console.log('ðŸ“± QR Code gÃ©nÃ©rÃ© â€” visite /qr pour scanner');
  clientStatus = 'qr_ready';
  qrCodeData   = await qrcode.toDataURL(qr);
});

client.on('ready', () => {
  console.log('âœ… WhatsApp connectÃ© !');
  isReady      = true;
  clientStatus = 'connected';
  qrCodeData   = null;
});

client.on('disconnected', (reason) => {
  console.log('âŒ DÃ©connectÃ©:', reason);
  isReady      = false;
  clientStatus = 'disconnected';
});

client.initialize();

// â”€â”€ Middleware Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function auth(req, res, next) {
  const token = req.headers['x-token'] || req.query.token;
  if (token !== TOKEN) return res.status(401).json({ error: 'Token invalide' });
  next();
}

// â”€â”€ Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Status
app.get('/status', (req, res) => {
  res.json({ status: clientStatus, ready: isReady });
});

// QR Code â€” page HTML pour scanner
app.get('/qr', (req, res) => {
  if (isReady) {
    return res.send('<h2 style="color:green;font-family:sans-serif">âœ… WhatsApp dÃ©jÃ  connectÃ© !</h2>');
  }
  if (!qrCodeData) {
    return res.send('<h2 style="font-family:sans-serif">â³ QR Code en cours de gÃ©nÃ©ration... Recharge dans 5 secondes.</h2><script>setTimeout(()=>location.reload(),5000)</script>');
  }
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>VALTEN â€” Scan WhatsApp</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 40px; background: #f5f5f5; }
        img  { border: 4px solid #25D366; border-radius: 12px; }
        h1   { color: #25D366; }
        p    { color: #666; }
      </style>
    </head>
    <body>
      <h1>ðŸ“± VALTEN WhatsApp</h1>
      <p>Scanne ce QR code avec ton WhatsApp â†’ Appareils connectÃ©s</p>
      <img src="${qrCodeData}" width="300" />
      <p>La page se recharge automatiquement aprÃ¨s connexion.</p>
      <script>
        setInterval(async () => {
          const r = await fetch('/status');
          const d = await r.json();
          if (d.ready) location.reload();
        }, 3000);
      </script>
    </body>
    </html>
  `);
});

// Envoyer un message
app.post('/send', auth, async (req, res) => {
  const { numero, message } = req.body;

  if (!numero || !message) {
    return res.status(400).json({ error: 'numero et message requis' });
  }
  if (!isReady) {
    return res.status(503).json({ error: 'WhatsApp non connectÃ©', status: clientStatus });
  }

  try {
    // Formater le numÃ©ro marocain
    let num = numero.replace(/[\s\-\(\)]/g, '');
    if (num.startsWith('+')) num = num.slice(1);
    if (num.startsWith('0'))  num = '212' + num.slice(1);

    const chatId = `${num}@c.us`;
    await client.sendMessage(chatId, message);

    console.log(`âœ… Message envoyÃ© Ã  ${num}`);
    res.json({ ok: true, numero: num });

  } catch (err) {
    console.error('Erreur envoi:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// â”€â”€ DÃ©marrage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.listen(PORT, () => {
  console.log(`ðŸš€ Serveur VALTEN WhatsApp dÃ©marrÃ© sur port ${PORT}`);
  console.log(`ðŸ“± QR Code: http://localhost:${PORT}/qr`);
});
