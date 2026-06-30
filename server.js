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
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      // 'https://theconnectventures.com', // uncomment + set once deployed
    ],
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
