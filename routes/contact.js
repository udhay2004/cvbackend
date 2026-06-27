const express = require('express');
const Lead = require('../models/Lead');

const router = express.Router();

// ---------- POST /api/contact ----------
// Called by the homepage lead-capture form in App.tsx.
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, targetMarket, service, description } = req.body;

    if (!name || !email || !targetMarket || !service) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    const lead = await Lead.create({
      name, email, phone, targetMarket, service, description,
    });

    res.status(201).json({ success: true, lead });
  } catch (err) {
    console.error('Create lead error:', err);
    res.status(500).json({ error: 'Could not submit. Please try again.' });
  }
});

module.exports = router;
