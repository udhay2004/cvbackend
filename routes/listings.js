const express = require('express');
const Listing = require('../models/Listing');
const router = express.Router();

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

module.exports = router;
