require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'https://theconnectventures.com',
  'https://www.theconnectventures.com',
  'https://connect-ventures-frontend-4nugap6fl.vercel.app', // Vercel deployment
  'http://localhost:5173',
  'http://localhost:3000',
];

// ─── REQUEST LOGGING ─────────────────────────────────────────────────────────
// Runs BEFORE cors so even requests that get CORS-blocked are logged with
// their method + path, instead of just an opaque "[CORS] Blocked: null" line.
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl} — Origin: ${req.headers.origin || 'none'}`);
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    // Allow no-origin (Postman/curl), exact matches, OR any *.vercel.app preview URL
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/.test(origin)
    ) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked: ${origin}`);
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));

app.use(express.json());

// ─── STATIC FILES ────────────────────────────────────────────────────────────
// Serves everything in /public, so a file at public/guides/usa.docx becomes
// downloadable at /static/guides/usa.docx — matching what routes/guides.js
// returns as `downloadUrl`.
app.use('/static', express.static(path.join(__dirname, 'public')));

// ─── MONGODB ─────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
})
  .then(() => console.log('[MongoDB] Connected — connectventures db'))
  .catch(err => {
    console.error('[MongoDB] Connection failed:', err.message);
    process.exit(1);
  });

// ─── ROUTES ──────────────────────────────────────────────────────────────────
app.use('/api/contact',   require('./routes/contact'));
app.use('/api/guides',    require('./routes/guides'));
app.use('/api/partners',  require('./routes/partners'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/projects',  require('./routes/projects'));  
app.use('/api/listings', require('./routes/listings'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ─── ADMIN OVERVIEW ──────────────────────────────────────────────────────────
const Lead     = require('./models/Lead');
const Guide    = require('./models/Guide');
const Partner  = require('./models/Partner');
const Campaign = require('./models/Campaign');

app.get('/api/admin/summary', async (req, res) => {
  try {
    const [leads, guides, partners, campaigns] = await Promise.all([
      Lead.countDocuments(),
      Guide.countDocuments(),
      Partner.countDocuments(),
      Campaign.countDocuments(),
    ]);
    res.json({ leads, guides, partners, campaigns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/leads', async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 }).limit(100);
    res.json({ count: leads.length, leads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── START ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`[Server] Running on port ${PORT}`));
