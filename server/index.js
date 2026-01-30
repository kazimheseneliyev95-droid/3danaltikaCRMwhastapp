const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { Server } = require('socket.io');
const http = require('http');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow connections from the frontend
    methods: ["GET", "POST"]
  }
});

// Initialize WhatsApp Client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// --- EVENTS ---

client.on('qr', (qr) => {
  console.log('QR RECEIVED', qr);
  io.emit('qr', qr); // Send QR to Frontend
});

client.on('ready', () => {
  console.log('Client is ready!');
  io.emit('ready', { status: 'connected' });
});

client.on('authenticated', () => {
  console.log('AUTHENTICATED');
  io.emit('authenticated', { status: 'authenticated' });
});

client.on('message', async msg => {
  // Filter for text messages only for now
  if(msg.type !== 'chat') return;

  const contact = await msg.getContact();
  
  const leadData = {
    phone: contact.number,
    name: contact.pushname || contact.name || "Unknown",
    message: msg.body,
    timestamp: new Date().toISOString()
  };

  console.log('NEW MESSAGE:', leadData);
  io.emit('new_message', leadData);
});

// --- API ENDPOINTS ---

app.get('/status', (req, res) => {
  res.json({ 
    status: client.info ? 'CONNECTED' : 'WAITING_QR',
    info: client.info 
  });
});

// Start Client
console.log("Initializing WhatsApp Client...");
client.initialize();

// Start Server
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
