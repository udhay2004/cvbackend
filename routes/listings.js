const express = require('express');
const Listing = require('../models/Listing');
const requireAdmin = require('../middleware/requireAdmin');
const router = express.Router();

// GET /api/marketplace — PUBLIC. Used by marketplace.html.
// Only ever returns approved listings, and never the direct contact
// fields — those should stay behind the CRM until a deal is actually
// pursued, not sit in the public page's rendered HTML/JSON.
router.get('/', async (req, res) => {
  try {
    const listings = await Listing.find({ status: 'approved' })
      .select('-contactEmail -contactPhone')
      .sort({ createdAt: -1 });
    res.json({ listings });
  } catch (err) {
    console.error('Fetch listings error:', err);
    res.status(500).json({ error: 'Could not fetch listings.' });
  }
});

// GET /api/marketplace/admin — ADMIN ONLY. Used by the CRM.
// Returns every listing regardless of status, with full contact fields.
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const listings = await Listing.find().sort({ createdAt: -1 });
    res.json({ listings });
  } catch (err) {
    console.error('Fetch listings (admin) error:', err);
    res.status(500).json({ error: 'Could not fetch listings.' });
  }
});

// POST /api/marketplace — submit a new listing (used by marketplace.html)
router.post('/', async (req, res) => {
  try {
    const { title, industry, country, dealType, askingPrice, revenue, yearEstablished, employees, summary, contactName, contactEmail, contactPhone } = req.body;
    if (!title || !industry || !country || !dealType || !summary || !contactName || !contactEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const listing = await Listing.create({ title, industry, country, dealType, askingPrice, revenue, yearEstablished, employees, summary, contactName, contactEmail, contactPhone });
    res.status(201).json({ success: true, listingId: listing._id });
  } catch (err) {
    console.error('Create listing error:', err);
    res.status(500).json({ error: 'Could not submit listing.' });
  }
});

// PATCH /api/marketplace/:id/status — approve/reject/reset (ADMIN ONLY — used by the CRM)
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.json({ success: true, listing });
  } catch (err) {
    console.error('Update listing status error:', err);
    res.status(500).json({ error: 'Could not update listing status.' });
  }
});

module.exports = router;
