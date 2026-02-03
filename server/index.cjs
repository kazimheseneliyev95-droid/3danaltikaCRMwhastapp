const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const cors = require('cors');
const qrcode = require('qrcode');

const app = express();
const server = http.createServer(app);

// Environment & Config
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all for local dev stability
    methods: ["GET", "POST"]
  }
});

// State Variables
let isReady = false;
let isAuthenticated = false;
let qrCodeData = null;

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🚀 CRM BACKEND INITIALIZING...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Initialize WhatsApp Client (Standard Config)
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './wwebjs_auth' }),
  puppeteer: {
    headless: true, // ⚠️ HEADLESS MUST BE TRUE FOR PRODUCTION (RAILWAY)
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined, // 🟢 Use Docker Chrome if available
    defaultViewport: null, // 🖥️ Full browser window (human-like)
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--start-maximized' // 🟢 Opens maximized (human-like)
    ]
  }
});

// ═══════════════════════════════════════════════════════════════
// 📡 STANDARD EVENT LISTENERS (Reliable)
// ═══════════════════════════════════════════════════════════════

client.on('loading_screen', (percent, message) => {
  console.log(`⌛ LOADING SCREEN: ${percent}% - ${message}`);
});

client.on('change_state', (state) => {
  console.log(`🔄 STATE CHANGED: ${state}`);
});

client.on('qr', (qr) => {
  console.log('📱 QR RECEIVED');
  qrCodeData = qr;
  isReady = false;
  isAuthenticated = false;
  io.emit('qr_code', qr);
});

client.on('ready', () => {
  console.log('✅ CLIENT READY');
  isReady = true;
  isAuthenticated = true;
  qrCodeData = null;
  io.emit('ready', { status: 'connected' });
  io.emit('crm:health_check', getHealthStatus());
});

// 🛡️ GLOBAL ERROR HANDLERS to prevent crash
process.on('uncaughtException', (err) => {
  console.error('🔥 UNCAUGHT EXCEPTION:', err);
  // Keep running if possible
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 UNHANDLED REJECTION:', reason);
});

client.on('authenticated', () => {
  console.log('🔑 CLIENT AUTHENTICATED');
  isAuthenticated = true;
  io.emit('authenticated', { status: 'authenticated' });

  // 🛡️ FORCE READY WATCHDOG (Relaxed to 15s)
  setTimeout(() => {
    if (!isReady) {
      console.log('⚠️ [WATCHDOG] Force-switching to READY state (Event missing)');
      isReady = true;
      io.emit('ready', { status: 'connected' });
      io.emit('crm:health_check', getHealthStatus());
    }
  }, 15000);
});

client.on('auth_failure', (msg) => {
  console.error('🚫 AUTH FAILURE:', msg);
  isAuthenticated = false;
  io.emit('auth_failure', msg);
});

client.on('disconnected', (reason) => {
  console.warn('⚠️ CLIENT DISCONNECTED:', reason);
  isReady = false;
  isAuthenticated = false;
  io.emit('disconnected', reason);
  // Optional: Auto-reinitialize logic could go here
});

// 📨 UNIFIED MESSAGE PROCESSOR (Incoming & Outgoing)
async function processMessage(msg, type) {
  try {
    // Basic Filter: Ignore Status Updates
    if (msg.from === 'status@broadcast') return;

    // Logging
    const prefix = msg.fromMe ? '📤 [OUTGOING]' : '📥 [INCOMING]';
    console.log(`${prefix} ${msg.from} -> ${msg.to} | ${msg.body.substring(0, 30)}...`);

    // 1. FAST EMIT (Instant)
    const rawNumber = msg.fromMe ? msg.to.split('@')[0] : msg.from.split('@')[0];

    // Safety check
    if (!rawNumber || rawNumber.length < 5) return;

    const fastPayload = {
      phone: rawNumber,
      name: `~${rawNumber}`,
      message: msg.body,
      whatsapp_id: msg.id._serialized,
      fromMe: msg.fromMe,
      timestamp: new Date().toISOString(),
      is_fast_emit: true
    };

    io.emit('new_message', fastPayload);

    // 2. ENRICHED EMIT (Background Name Resolution)
    try {
      // Mock contact fetch if manual injection (no getContact function)
      const contact = msg.getContact ? await msg.getContact() : { name: 'Self-Test' };

      const enrichedPayload = {
        ...fastPayload,
        name: contact.pushname || contact.name || `+${rawNumber}`,
        is_fast_emit: false
      };
      io.emit('new_message', enrichedPayload);
    } catch (err) {
      // Ignore errors
    }

  } catch (error) {
    console.error('❌ Error processing message:', error);
  }
}

// Handler for INCOMING messages (Standard)
client.on('message', async (msg) => {
  processMessage(msg, 'INCOMING');
});

// Handler for OUTGOING messages (Sent by me)
client.on('message_create', async (msg) => {
  if (msg.fromMe) {
    processMessage(msg, 'OUTGOING');
  }
});


// ═══════════════════════════════════════════════════════════════
// 🔌 SOCKET.IO CONNECTION
// ═══════════════════════════════════════════════════════════════

io.on('connection', (socket) => {
  console.log('👤 NEW UI CLIENT CONNECTED:', socket.id);

  // Send immediate state
  socket.emit('crm:health_check', getHealthStatus());

  // If we have a pending QR, send it (for refreshing page)
  if (qrCodeData && !isAuthenticated) {
    socket.emit('qr_code', qrCodeData);
  }

  // 🚀 FIX: If already authenticated, tell the new client immediately!
  if (isAuthenticated) {
    socket.emit('authenticated', { status: 'authenticated' });
  }
  if (isReady) {
    socket.emit('ready', { status: 'connected' });
  }
});

function getHealthStatus() {
  let status = 'OFFLINE';
  if (isReady) status = 'CONNECTED';
  else if (isAuthenticated) status = 'SYNCING';

  return {
    whatsapp: status,
    socket_clients: io.engine.clientsCount,
    timestamp: new Date().toISOString()
  };
}

// ═══════════════════════════════════════════════════════════════
// 🛠️ API ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// 🧪 CRITICAL TEST ROUTE (Requested by User)
app.get('/__test_emit', (req, res) => {
  console.log('🧪 TEST: Manually emitting socket event...');

  const testPayload = {
    phone: '994500000000',
    name: 'TEST USER (Backend)',
    message: 'This is a test message from /__test_emit',
    whatsapp_id: 'TEST_ID_' + Date.now(),
    fromMe: false,
    timestamp: new Date().toISOString(),
    is_fast_emit: true
  };

  io.emit('new_message', testPayload);
  res.send(`<h1>Socket Test Emitted</h1><pre>${JSON.stringify(testPayload, null, 2)}</pre>`);
});

app.get('/health', (req, res) => {
  res.json(getHealthStatus());
});

app.get('/chats/recent', async (req, res) => {
  console.log('📂 RECENT CHATS REQUESTED');
  if (!isReady) {
    console.warn('⚠️ Request rejected: Client not ready');
    return res.status(503).json({ error: 'WhatsApp client not ready yet' });
  }
  try {
    console.log('⏳ Fetching chats from WhatsApp Client...');
    const chatsPromise = client.getChats();
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout getting chats')), 10000));

    const chats = await Promise.race([chatsPromise, timeoutPromise]);
    console.log(`✅ RAW CHATS FOUND: ${chats.length}`);

    const recent = chats.slice(0, 20).map(c => ({
      name: c.name,
      unread: c.unreadCount,
      lastMessage: c.lastMessage ? c.lastMessage.body : '',
      timestamp: c.timestamp || Date.now() / 1000,
      phone: c.id.user
    }));

    console.log(`📤 RETURNING ${recent.length} CHATS to Frontend`);
    res.json(recent);
  } catch (e) {
    console.error('⚠️ Error fetching chats:', e);
    res.json([]);
  }
});

// 🧪 CRITICAL WHATSAPP SEND TEST
app.get('/__test_send_whatsapp', async (req, res) => {
  let phone = req.query.phone;
  if (!phone) return res.send('Please provide ?phone=994XXXXXXXX');

  // Auto-fix common prefix issues for Azerbaijan
  if (phone.length === 9) phone = '994' + phone; // 556060900 -> 994556060900
  if (phone.startsWith('0')) phone = '994' + phone.substring(1); // 055... -> 99455...
  if (phone.startsWith('55') && phone.length === 9) phone = '994' + phone;

  const chatId = `${phone}@c.us`;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🧪 TEST SEND REQUEST`);
  console.log(`📍 Phone: ${phone}`);
  console.log(`📍 Chat ID: ${chatId}`);
  console.log(`📍 Client Auth State: ${isAuthenticated}`);
  console.log(`📍 Client Ready State: ${isReady}`);

  if (!isAuthenticated && !isReady) {
    return res.status(500).send(`<h1>Client Not Ready</h1><p>Auth: ${isAuthenticated}, Ready: ${isReady}</p><p>Please scan QR code first.</p>`);
  }

  try {
    const sentMsg = await client.sendMessage(chatId, '🤖 Hello! This is a backend self-test message. If you see this, sending works!');
    console.log('✅ SENT SUCCESSFULLY via API');

    // 🚀 MANUALLY INJECT INTO CRM (Since event listener might skip API messages)
    await processMessage({
      ...sentMsg,
      body: sentMsg.body,
      fromMe: true,
      from: sentMsg.from,
      to: sentMsg.to,
      id: sentMsg.id,
      // Manual injection mock
      getContact: async () => ({ name: 'Self-Test (Backend)' })
    }, 'OUTGOING');

    res.send(`<h1>Message Sent & Logged!</h1><p>Target: ${chatId}</p><p>Check CRM Dashboard now.</p>`);
  } catch (e) {
    console.error('❌ SEND FAILED ERROR:', e);
    res.status(500).send(`<h1>Send Failed</h1><pre>${e.stack || e.message}</pre>`);
  }
});

// START
client.initialize();

// SERVE FRONTEND (Monolith Mode)
const path = require('path');
const DIST_PATH = path.join(__dirname, '../dist');

// Serve static files
app.use(express.static(DIST_PATH));

// Handle React Routing (SPA Fallback) - Express 5 Compatible
app.use((req, res, next) => {
  const file = req.path.split('/').pop();
  if (file && file.includes('.')) {
    // If it has an extension but wasn't found in static, 404
    return res.status(404).send('Not found');
  }
  // Otherwise serve index.html
  res.sendFile(path.join(DIST_PATH, 'index.html'));
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
