const express = require('express');
const Campaign = require('../models/Campaign');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// Turns a title into a URL-friendly slug, e.g.
// "Launching a packaged food product in India" -> "launching-a-packaged-food-product-in-india"
function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// ---------- GET /api/campaigns/admin/all ----------
// ADMIN ONLY. Every status, with contactEmail included. Registered before
// /:slug so it isn't swallowed by the slug route below.
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    res.json({ campaigns });
  } catch (err) {
    console.error('List campaigns (admin) error:', err);
    res.status(500).json({ error: 'Could not load campaigns.' });
  }
});

// ---------- GET /api/campaigns ----------
// Public. campaigns.html calls this with ?status=open,matched,closed
// and expects back: { campaigns: [ {slug, title, originCountry, ...} ] }
// contactEmail is stripped — a visitor doesn't need the founder's direct
// email sitting in a public JSON response.
router.get('/', async (req, res) => {
  try {
    const statusParam = req.query.status; // e.g. "open,matched,closed"
    const filter = {};
    if (statusParam) {
      filter.status = { $in: statusParam.split(',') };
    } else {
      filter.status = { $in: ['open', 'matched', 'closed'] };
    }

    const campaigns = await Campaign.find(filter)
      .select('-contactEmail')
      .sort({ createdAt: -1 });
    res.json({ campaigns });
  } catch (err) {
    console.error('List campaigns error:', err);
    res.status(500).json({ error: 'Could not load campaigns.' });
  }
});

// ---------- GET /api/campaigns/:slug ----------
// Public. campaigns.html calls this to render the dossier/detail view.
router.get('/:slug', async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ slug: req.params.slug }).select('-contactEmail');
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }
    res.json(campaign);
  } catch (err) {
    console.error('Get campaign error:', err);
    res.status(500).json({ error: 'Could not load campaign.' });
  }
});

// ---------- POST /api/campaigns ----------
// Internal use for now — this is what the chatbot backend will call
// once a founder consents to publishing. Not yet wired to anything
// public; no auth gate added yet since the chatbot logic doesn't exist.
router.post('/', async (req, res) => {
  try {
    const {
      title, originCountry, destCountry, topic, license,
      blurb, details, postedAs, contactEmail, extractedTags,
    } = req.body;

    if (!title || !originCountry || !destCountry || !topic || !license || !blurb || !details) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    let slug = slugify(title);
    const existing = await Campaign.findOne({ slug });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const campaign = await Campaign.create({
      slug, title, originCountry, destCountry, topic, license,
      blurb, details, postedAs, contactEmail,
      extractedTags: extractedTags || [],
      status: 'open',
    });

    res.status(201).json(campaign);
  } catch (err) {
    console.error('Create campaign error:', err);
    res.status(500).json({ error: 'Could not create campaign.' });
  }
});

module.exports = router;
