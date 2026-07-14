const mongoose = require('mongoose');

const partnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true },
    organization: { type: String, trim: true },
    country: { type: String, trim: true },

    // Raw free text exactly as the person typed it — never discarded,
    // since this is the source of truth if we ever need to re-extract
    // tags with a better prompt later.
    marketsText: { type: String, trim: true },
    expertiseText: { type: String, trim: true },
    bio: { type: String, trim: true },

    // Structured tags extracted by Claude from marketsText + expertiseText.
    // This is what matching actually runs against — see routes/partners.js.
    extractedTags: [{ type: String }],

    // Admin approval state — shown/edited from the CRM's Partners tab.
    // This did not exist before, which is why every partner rendered as
    // "pending" in the CRM (it falls back to pending when status is
    // undefined) and clicking Approve/Reject 404'd: there was no route to
    // hit. isActive stays separate — it's about matching eligibility
    // (see services/matching.js, which only reads Partner.find({isActive:true})),
    // status is purely about whether you've reviewed/approved the signup.
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Partner', partnerSchema);
