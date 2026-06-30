const mongoose = require('mongoose');

const guideLeadSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  company: { type: String, required: true },
  country: { type: String, required: true },
  phone: { type: String },
  guideCountry: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('GuideLead', guideLeadSchema);
