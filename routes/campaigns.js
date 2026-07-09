const express = require('express');
const Campaign = require('../models/Campaign');
const Partner = require('../models/Partner');
const requireAdmin = require('../middleware/requireAdmin');
const requireService = require('../middleware/requireService');
const { extractCampaignTags } = require('../services/tagExtraction');
const { matchPartners } = require('../services/matching');
const { notifyAdminPendingCampaign, notifyPartnerMatch, notifySubmitterApproved } = require('../services/notify');

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
// Called by the chatbot backend once a founder consents to being connected
// with the partner network. Gated behind requireService — this is a
// server-to-server call, not something the public frontend hits directly.
//
// Campaigns always land as 'pending' here, regardless of what the caller
// sends — publishing + partner emails only happen via the explicit
// POST /:slug/approve step below, so a human always reviews before any
// partner gets an email about it.
router.post('/', requireService, async (req, res) => {
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

    let tags = Array.isArray(extractedTags) ? extractedTags.filter(Boolean) : [];
    if (!tags.length) {
      // Chatbot normally sends its own tags; this is a fallback for any
      // other future caller that doesn't.
      tags = await extractCampaignTags({ topic, license, originCountry, destCountry, details });
    }

    const campaign = await Campaign.create({
      slug, title, originCountry, destCountry, topic, license,
      blurb, details, postedAs, contactEmail,
      extractedTags: tags,
      status: 'pending',
    });

    notifyAdminPendingCampaign(campaign).catch(err =>
      console.error('[campaigns] admin pending-notify failed:', err.message)
    );

    res.status(201).json(campaign);
  } catch (err) {
    console.error('Create campaign error:', err);
    res.status(500).json({ error: 'Could not create campaign.' });
  }
});

// ---------- POST /api/campaigns/:slug/approve ----------
// Admin only. Matches the campaign against the partner pool, emails the
// matched partners, flips status to 'matched' (or 'open' if nobody
// matched), and lets the original submitter know.
router.post('/:slug/approve', requireAdmin, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ slug: req.params.slug });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }
    if (campaign.status !== 'pending') {
      return res.status(400).json({ error: `Campaign is already '${campaign.status}'.` });
    }

    const partners = await Partner.find({ isActive: true });
    const matches = matchPartners(partners, campaign.extractedTags).slice(0, 8);

    await Promise.all(
      matches.map(m =>
        notifyPartnerMatch(m.partner, campaign).catch(err =>
          console.error('[campaigns] partner email failed for', m.partner.email, '-', err.message)
        )
      )
    );

    campaign.status = matches.length ? 'matched' : 'open';
    await campaign.save();

    notifySubmitterApproved(campaign, matches.length).catch(err =>
      console.error('[campaigns] submitter email failed:', err.message)
    );

    res.json({
      campaign,
      matchedPartners: matches.map(m => ({ id: m.partner._id, name: m.partner.name, score: m.score })),
    });
  } catch (err) {
    console.error('Approve campaign error:', err);
    res.status(500).json({ error: 'Could not approve campaign.' });
  }
});

module.exports = router;
