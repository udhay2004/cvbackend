// services/matching.js
//
// Simple, explainable tag-overlap matching between a Campaign and the
// Partner pool. No embeddings/fuzzy matching on purpose — tags are already
// normalized by Claude at write time (see tagExtraction.js), so exact
// (case-insensitive) overlap is enough and keeps this easy to debug.

function normalizeTag(t) {
  return String(t || '').trim().toLowerCase();
}

// partners: array of Partner docs (must have .extractedTags)
// campaignTags: array of strings
// Returns [{ partner, score, matchedTags }], sorted by score desc, score > 0 only.
function matchPartners(partners, campaignTags) {
  const campaignSet = new Set((campaignTags || []).map(normalizeTag));
  if (campaignSet.size === 0) return [];

  return partners
    .map(partner => {
      const matchedTags = (partner.extractedTags || []).filter(t => campaignSet.has(normalizeTag(t)));
      return { partner, score: matchedTags.length, matchedTags };
    })
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score);
}

module.exports = { matchPartners };
