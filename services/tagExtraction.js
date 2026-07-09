// services/tagExtraction.js
//
// Turns free text (a partner's stated markets/expertise, or a campaign's
// topic/license/details) into a small set of normalized tags that
// services/matching.js can compare with simple overlap scoring.
//
// Same pattern the chatbot repo already uses for its onboarding extractor:
// force a tool call so we get structured JSON back instead of parsing prose.

const ANTHROPIC_API_KEY = (process.env.ANTHROPIC_API_KEY || '').trim();
const TAG_MODEL = 'claude-haiku-4-5-20251001';

const TAG_TOOL = {
  name: 'record_tags',
  description: 'Extract a short list of structured matching tags from the text.',
  input_schema: {
    type: 'object',
    properties: {
      tags: {
        type: 'array',
        items: { type: 'string' },
        description:
          '5-15 short tags, Title Case, no duplicates. Include: countries/regions, ' +
          'named licenses/regulatory bodies (e.g. FSSAI, FDA, CE Mark, GDPR), ' +
          'industries/sectors, and service types (e.g. "Import Licensing", ' +
          '"Company Registration", "Distributor Sourcing"). Only include what the ' +
          'text actually supports — never invent tags not implied by the input.',
      },
    },
    required: ['tags'],
  },
};

async function callTagExtractor(inputText) {
  if (!ANTHROPIC_API_KEY) {
    console.error('[tagExtraction] ANTHROPIC_API_KEY not set — returning no tags.');
    return [];
  }
  if (!inputText || !inputText.trim()) return [];

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: TAG_MODEL,
        max_tokens: 300,
        tools: [TAG_TOOL],
        tool_choice: { type: 'tool', name: 'record_tags' },
        messages: [{ role: 'user', content: inputText }],
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('[tagExtraction] Claude error:', JSON.stringify(data).slice(0, 300));
      return [];
    }
    const block = (data.content || []).find(b => b.type === 'tool_use' && b.name === 'record_tags');
    const tags = block?.input?.tags;
    return Array.isArray(tags) ? tags.filter(Boolean) : [];
  } catch (err) {
    console.error('[tagExtraction] request failed:', err.message);
    return [];
  }
}

// Used by routes/partners.js on partner signup.
async function extractPartnerTags({ marketsText, expertiseText, bio }) {
  const input = [
    marketsText ? `Markets they can help with: ${marketsText}` : '',
    expertiseText ? `Their expertise: ${expertiseText}` : '',
    bio ? `Bio: ${bio}` : '',
  ].filter(Boolean).join('\n');
  return callTagExtractor(input);
}

// Fallback used by routes/campaigns.js if a campaign arrives without
// extractedTags already set (e.g. posted from somewhere other than the
// chatbot, which normally sends its own tags).
async function extractCampaignTags({ topic, license, originCountry, destCountry, details }) {
  const input = [
    topic ? `Topic: ${topic}` : '',
    license ? `License/regulation: ${license}` : '',
    originCountry ? `Origin country: ${originCountry}` : '',
    destCountry ? `Destination/target country: ${destCountry}` : '',
    details ? `Details: ${details}` : '',
  ].filter(Boolean).join('\n');
  return callTagExtractor(input);
}

module.exports = { extractPartnerTags, extractCampaignTags };
