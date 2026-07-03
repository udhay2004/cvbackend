const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema(
  {
    title:         { type: String, required: true, trim: true },
    industry:      { type: String, required: true, trim: true },
    country:       { type: String, required: true, trim: true },
    dealType:      { type: String, required: true, trim: true },
    askingPrice:   { type: String, trim: true },
    revenue:       { type: String, trim: true },
    summary:       { type: String, required: true },
    contactName:   { type: String, required: true, trim: true },
    contactEmail:  { type: String, required: true, trim: true, lowercase: true },
    contactPhone:  { type: String, trim: true },
    status:        { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Listing', listingSchema);
