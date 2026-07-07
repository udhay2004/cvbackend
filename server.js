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
  'https://snazzy-figolla-8213ce.netlify.app'   // ← add this line
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
    // Allow no-origin (Postman/curl), exact matches, OR a preview URL that
    // is actually this project (e.g. connect-ventures-frontend-git-xyz.vercel.app).
    // Matching bare ".vercel.app" previously let ANY Vercel-hosted site —
    // including an attacker's own throwaway project — send credentialed
    // requests to this API. Scoping the regex to the project name closes that.
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      /^https:\/\/connect-ventures-frontend[a-z0-9-]*\.vercel\.app$/.test(origin)
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
// IMPORTANT: we never process.exit() on a connection failure anymore.
// On Render, exiting the process just triggers a restart — if the DB is
// still unreachable (bad creds, IP allowlist, paused cluster) that becomes
// an infinite crash loop, which from the frontend looks exactly like
// "sometimes it saves, mostly it doesn't." Instead we keep the HTTP server
// alive (so /health always responds) and retry the DB connection with
// backoff, logging clearly each time so Render logs show the real cause.
if (!process.env.MONGODB_URI) {
  console.error('[MongoDB] MONGODB_URI is not set in the environment — writes will fail until this is fixed.');
}

let mongoRetryDelayMs = 3000; // starts at 3s, backs off up to 30s
function connectMongo() {
  if (!process.env.MONGODB_URI) return;
  mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  })
    .then(() => {
      console.log('[MongoDB] Connected — connectventures db');
      mongoRetryDelayMs = 3000; // reset backoff on success
    })
    .catch(err => {
      console.error('[MongoDB] Connection failed:', err.message);
      console.error(`[MongoDB] Retrying in ${mongoRetryDelayMs / 1000}s...`);
      setTimeout(connectMongo, mongoRetryDelayMs);
      mongoRetryDelayMs = Math.min(mongoRetryDelayMs * 2, 30000);
    });
}
connectMongo();

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Disconnected — will attempt to reconnect.');
  connectMongo();
});
mongoose.connection.on('error', err => {
  console.error('[MongoDB] Runtime error:', err.message);
});

// Gate every /api write/read route behind an actual DB connection check.
// Without this, a request that comes in while Mongo is mid-reconnect just
// hangs until Mongoose's own buffering timeout fires (10s+), which is
// exactly the kind of silent slowness/failure you were seeing. Now it
// fails fast with a clear message instead.
app.use('/api', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    console.warn(`[MongoDB] Rejecting ${req.method} ${req.originalUrl} — DB not connected (state=${mongoose.connection.readyState})`);
    return res.status(503).json({ error: 'Database temporarily unavailable. Please try again in a moment.' });
  }
  next();
});

// ─── ROUTES ──────────────────────────────────────────────────────────────────
app.use('/api/contact',   require('./routes/contact'));
app.use('/api/guides',    require('./routes/guides'));
app.use('/api/partners',  require('./routes/partners'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/projects',  require('./routes/projects'));  
app.use('/api/marketplace', require('./routes/listings'));

// Health check — includes live DB connection state so you can hit this
// URL directly in a browser to confirm whether Mongo is actually connected,
// instead of guessing from symptoms on the frontend.
// readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
app.get('/health', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status: 'ok',
    ts: new Date().toISOString(),
    mongo: states[mongoose.connection.readyState] || 'unknown',
  });
});

// ─── ADMIN OVERVIEW ──────────────────────────────────────────────────────────
const Lead     = require('./models/Lead');
const Guide    = require('./models/Guide');
const Partner  = require('./models/Partner');
const Campaign = require('./models/Campaign');
const requireAdmin = require('./middleware/requireAdmin');

app.get('/api/admin/summary', requireAdmin, async (req, res) => {
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

app.get('/api/admin/leads', requireAdmin, async (req, res) => {
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
