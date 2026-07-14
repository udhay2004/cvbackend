const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    // URL-friendly id used in /api/campaigns/:slug — generated from title.
    slug: { type: String, required: true, unique: true, index: true },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    originCountry: { type: String, required: true, trim: true },
    destCountry: { type: String, required: true, trim: true },

    // Single primary topic shown as a tag (e.g. "Food & Beverage").
    topic: { type: String, required: true, trim: true },

    // Single primary license/regulatory tag shown as a tag (e.g. "FSSAI").
    license: { type: String, required: true, trim: true },

    blurb: { type: String, required: true, maxlength: 300 },
    details: { type: String, required: true, maxlength: 5000 },

    // Anonymized attribution shown on cards, e.g. "A founder from USA".
    postedAs: { type: String, required: true },

    status: {
      type: String,
      enum: ['pending', 'open', 'matched', 'closed'],
      default: 'pending',
      index: true,
    },

    // The full structured tag set extracted by Claude from the chatbot
    // conversation — used for matching against partners, NOT directly
    // rendered (the frontend only shows `topic` + `license` as chips).
    extractedTags: [{ type: String }],

    // Link back to the chatbot conversation / founder, once that exists.
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // REQUIRED as of the partner-query flow: the chatbot must only create a
    // Campaign once it has actually collected the person's name + a way to
    // reach them (email and/or phone). This is the admin's one guardrail —
    // a query with no contact info can't be verified, so it should never
    // reach the CRM at all. Enforced here (not just in the chatbot) so a
    // bug in the chatbot's gating can't silently create unreachable leads.
    contactName: { type: String, trim: true },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          // At least one of contactEmail / contactPhone must be present.
          // Mongoose validators run per-field, so we check the sibling
          // field here rather than relying on a single `required: true`.
          return !!(v || this.contactPhone);
        },
        message: 'A campaign needs at least a contact email or phone before it can be created.',
      },
    },
    contactPhone: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Campaign', campaignSchema);
