const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const campaignsRoutes = require('./routes/campaigns');
const partnersRoutes = require('./routes/partners');
const contactRoutes = require('./routes/contact');
const guidesRoutes = require('./routes/guides');
const app = express();
// Allow your AI Studio frontend (and local dev) to call this API.
// Add your real deployed frontend domain here once you have one.
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://connect-ventures-frontend-jwirjkfc7.vercel.app',
  process.env.FRONTEND_URL, // e.g. https://your-custom-domain.com — set this in Render's env vars once you have a custom domain
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow non-browser tools (curl/Postman) which send no origin
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // allow any *.vercel.app preview/prod deployment
      if (/\.vercel\.app$/.test(new URL(origin).hostname)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use('/static/guides', express.static('public/guides'));
// Simple health check — visiting this in a browser confirms the
// server itself is alive, even before checking the database connection.
app.get('/', (req, res) => {
  res.json({ status: 'Connect Ventures backend is running' });
});
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/partners', partnersRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/guides', guidesRoutes);
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
