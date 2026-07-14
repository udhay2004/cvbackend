const express = require('express');
const Partner = require('../models/Partner');
const requireAdmin = require('../middleware/requireAdmin');
const { extractPartnerTags } = require('../services/tagExtraction');

const router = express.Router();

// ---------- POST /api/partners ----------
// Public. become-a-partner.html sends:
// { name, email, phone, organization, country, marketsText, expertiseText, bio }
//
// extractedTags is now populated synchronously via Claude before we save —
// this is what routes/campaigns.js matches against later. If the Claude
// call fails for any reason, extractPartnerTags() returns [] rather than
// throwing, so signup still succeeds; the partner just won't be matchable
// until re-tagged (see the admin re-tag route below).
//
// New signups always land as status: 'pending' (the schema default) — an
// admin has to approve them in the CRM before matching starts treating
// them as a real, vetted partner.
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, organization, country, marketsText, expertiseText, bio } = req.body;

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
      country,
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
// Admin only — for the matching step later, and for the CRM's Partners
// tab. Returns every partner regardless of status (the CRM itself filters
// by status client-side), so pending/rejected ones are still visible for
// review — only services/matching.js restricts to isActive.
router.get('/', requireAdmin, async (req, res) => {
  try {
    const partners = await Partner.find().sort({ createdAt: -1 });
    res.json({ partners });
  } catch (err) {
    console.error('List partners error:', err);
    res.status(500).json({ error: 'Could not load partners.' });
  }
});

// ---------- PATCH /api/partners/:id/status ----------
// Admin only. This is what the CRM's Approve/Reject buttons call — it
// didn't exist before, which is why approving a partner in the CRM 404'd.
//
// Rejecting a partner also flips isActive to false, so
// services/matching.js (which only ever reads Partner.find({isActive:true}))
// stops considering them for future campaign matches immediately —
// no separate step needed. Approving flips isActive back to true, in case
// you're reversing an earlier rejection.
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['pending', 'approved', 'rejected'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
    }

    const update = { status };
    if (status === 'rejected') update.isActive = false;
    if (status === 'approved') update.isActive = true;

    const partner = await Partner.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found.' });
    }
    res.json({ partner });
  } catch (err) {
    console.error('Update partner status error:', err);
    res.status(500).json({ error: 'Could not update partner status.' });
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
