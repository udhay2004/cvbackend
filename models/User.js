const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // Only set for email/password signups. Never returned in API responses.
    passwordHash: { type: String, select: false },

    // Only set for Google signups.
    googleId: { type: String, unique: true, sparse: true, index: true },

    // 'local' | 'google' — tracks how the account was created.
    provider: { type: String, enum: ['local', 'google'], required: true },

    avatarUrl: { type: String },

    // Useful for moderating who can post listings later.
    isVerified: { type: Boolean, default: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);