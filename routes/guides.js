const express = require('express');
const router = express.Router();
const GuideLead = require('../models/Guide');

const COUNTRY_FILE_MAP = {
  Australia: 'australia.docx',
  Canada: 'canada.docx',
  Estonia: 'estonia.docx',
  Germany: 'germany.docx',
  'Hong Kong': 'hongkong.docx',
  Indonesia: 'indonesia.docx',
  Italy: 'italy.docx',
  Netherlands: 'netherlands.docx',
  Philippines: 'philippines.docx',
  Singapore: 'singaporee.docx',
  Switzerland: 'switzerland.docx',
  Thailand: 'thailand.docx',
  'United Arab Emirates': 'uae.docx',
  'United Kingdom': 'uk.docx',
  'United States': 'usa.docx',
  Vietnam: 'vietnam.docx',
};

router.post('/download', async (req, res) => {
  try {
    const { fullName, email, company, country, phone, guideCountry } = req.body;

    if (!fullName || !email || !company || !country || !guideCountry) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const fileName = COUNTRY_FILE_MAP[guideCountry];
    if (!fileName) {
      return res.status(404).json({ error: 'Guide not found for this country' });
    }

    await GuideLead.create({ fullName, email, company, country, phone, guideCountry });

    res.json({ downloadUrl: `/static/guides/${fileName}` });
  } catch (err) {
    console.error('Guide download error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
