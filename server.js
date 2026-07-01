require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'https://theconnectventures.com',
  'https://www.theconnectventures.com',
  'http://localhost:5173',   // Vite dev
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman) or matching origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));

app.use(express.json());

// ─── MONGODB ─────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
})
  .then(() => console.log('[MongoDB] Connected to cluster — connectventures db'))
  .catch(err => {
    console.error('[MongoDB] Connection failed:', err.message);
    process.exit(1);
  });

// ─── ROUTES ──────────────────────────────────────────────────────────────────
app.use('/api/contact', require('./routes/contact'));

// Health check — useful for Render uptime monitoring
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ─── START ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`[Server] Running on port ${PORT}`));
