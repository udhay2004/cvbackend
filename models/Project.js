const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    slug:         { type: String, required: true, unique: true, index: true },
    title:        { type: String, required: true, trim: true },
    industry:     { type: String, required: true, trim: true },
    country:      { type: String, required: true, trim: true },
    summary:      { type: String, required: true, trim: true },
    details:      { type: String, required: true },
    companyName:  { type: String, required: true, trim: true },
    contactEmail: { type: String, required: true, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },
    status:       { type: String, enum: ['open', 'pending', 'closed'], default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);
