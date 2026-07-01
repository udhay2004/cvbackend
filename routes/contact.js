const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');

// POST /api/contact — save a new lead from the website contact form
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, targetMarket, service, description } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    const lead = await Lead.create({
      name,
      email,
      phone,
      targetMarket,
      service,
      description,
      source: 'website-contact-form',
    });

    console.log(`[Lead saved] ${lead.name} <${lead.email}> — ${lead.targetMarket} / ${lead.service}`);

    return res.status(201).json({ success: true, leadId: lead._id });
  } catch (err) {
    console.error('[Contact route error]', err);
    return res.status(500).json({ error: 'Failed to save enquiry.' });
  }
});

// GET /api/contact — retrieve all leads (for admin use)
router.get('/', async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 }).limit(100);
    return res.json({ count: leads.length, leads });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch leads.' });
  }
});

module.exports = router;
