const express = require('express');
const Partner = require('../models/Partner');
const requireAdmin = require('../middleware/requireAdmin');
const { extractPartnerTags } = require('../services/tagExtraction');

const router = express.Router();

// ---------- POST /api/partners ----------
// Public. become-a-partner.html sends:
// { name, email, phone, organization, marketsText, expertiseText, bio }
//
// extractedTags is now populated synchronously via Claude before we save —
// this is what routes/campaigns.js matches against later. If the Claude
// call fails for any reason, extractPartnerTags() returns [] rather than
// throwing, so signup still succeeds; the partner just won't be matchable
// until re-tagged (see the admin re-tag route below).
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, organization, marketsText, expertiseText, bio } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }
    if (!marketsText && !expertiseText) {
      return res.status(400).json({ error: 'Please share at least some markets or expertise.' });
    }

    const extractedTags = await extractPartnerTags({ marketsText, expertiseText, bio });

    const partner = await Partner.create({
      name,
      email: email.toLowerCase(),
      phone,
      organization,
      marketsText,
      expertiseText,
      bio,
      extractedTags,
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
// Admin only — for the matching step later. This returns email/phone/bio,
// so it must not be public.
router.get('/', requireAdmin, async (req, res) => {
  try {
    const partners = await Partner.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ partners });
  } catch (err) {
    console.error('List partners error:', err);
    res.status(500).json({ error: 'Could not load partners.' });
  }
});

// ---------- POST /api/partners/retag ----------
// Admin only, one-off/occasional use. Backfills extractedTags for any
// partner that signed up before tag extraction existed (extractedTags: []).
router.post('/retag', requireAdmin, async (req, res) => {
  try {
    const untagged = await Partner.find({
      $or: [{ extractedTags: { $exists: false } }, { extractedTags: { $size: 0 } }],
    });

    let updated = 0;
    for (const partner of untagged) {
      const extractedTags = await extractPartnerTags({
        marketsText: partner.marketsText,
        expertiseText: partner.expertiseText,
        bio: partner.bio,
      });
      if (extractedTags.length) {
        partner.extractedTags = extractedTags;
        await partner.save();
        updated++;
      }
    }

    res.json({ checked: untagged.length, updated });
  } catch (err) {
    console.error('Retag partners error:', err);
    res.status(500).json({ error: 'Could not retag partners.' });
  }
});

module.exports = router;
