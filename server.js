require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'https://theconnectventures.com',
  'https://www.theconnectventures.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, callback) => {
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
  .then(() => console.log('[MongoDB] Connected — connectventures db'))
  .catch(err => {
    console.error('[MongoDB] Connection failed:', err.message);
    process.exit(1);
  });

// ─── ROUTES ──────────────────────────────────────────────────────────────────
app.use('/api/contact',   require('./routes/contact'));    // website contact form leads
app.use('/api/guides',    require('./routes/guides'));     // guide downloads (gated PDF)
app.use('/api/partners',  require('./routes/partners'));   // partner applications
app.use('/api/campaigns', require('./routes/campaigns')); // campaign tracking

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ─── QUICK ADMIN OVERVIEW ────────────────────────────────────────────────────
// Hit GET /api/admin/summary to see counts across all collections at once
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

// GET /api/admin/leads — most recent 100 leads across all sources
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
