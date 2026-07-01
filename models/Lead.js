const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, trim: true, lowercase: true },
  phone:        { type: String, trim: true },
  targetMarket: { type: String, trim: true },
  service:      { type: String, trim: true },
  description:  { type: String, trim: true },
  source:       { type: String, default: 'website-contact-form' },
  status:       { type: String, enum: ['new', 'contacted', 'qualified', 'closed'], default: 'new' },
}, { timestamps: true }); // adds createdAt + updatedAt automatically

module.exports = mongoose.model('Lead', leadSchema);
