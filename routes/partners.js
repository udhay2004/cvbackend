const express = require('express');
const Partner = require('../models/Partner');

const router = express.Router();

// ---------- POST /api/partners ----------
// Public. become-a-partner.html sends:
// { name, email, phone, organization, marketsText, expertiseText, bio }
//
// NOTE: extractedTags is intentionally left empty here for now. The real
// Claude-based tag extraction is a separate piece we haven't built yet.
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, organization, marketsText, expertiseText, bio } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }
    if (!marketsText && !expertiseText) {
      return res.status(400).json({ error: 'Please share at least some markets or expertise.' });
    }

    const partner = await Partner.create({
      name,
      email: email.toLowerCase(),
      phone,
      organization,
      marketsText,
      expertiseText,
      bio,
      extractedTags: [], // populated later by the tagging step
    });

    res.status(201).json({
      partner,
      message: "You're registered. We'll email you when a campaign matches what you know.",
    });
  } catch (err) {
    console.error('Create partner error:', err);
    res.status(500).json({ error: 'Could not register. Please try again.' });
  }
});

// ---------- GET /api/partners ----------
// Internal use — for the matching step later, and so you can sanity-check
// submissions via Postman while there's no admin UI yet.
router.get('/', async (req, res) => {
  try {
    const partners = await Partner.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ partners });
  } catch (err) {
    console.error('List partners error:', err);
    res.status(500).json({ error: 'Could not load partners.' });
  }
});

module.exports = router;