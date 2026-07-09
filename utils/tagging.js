const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const TAG_TOOL = {
  name: 'extract_tags',
  description: 'Extract structured matching tags from free text describing a business need or a partner\'s expertise.',
  input_schema: {
    type: 'object',
    properties: {
      countries: { type: 'array', items: { type: 'string' }, description: 'Countries/markets mentioned, in English, e.g. ["India", "UAE"].' },
      industries: { type: 'array', items: { type: 'string' }, description: 'Industry/sector keywords, e.g. ["Food & Beverage", "Fintech"].' },
      licenses: { type: 'array', items: { type: 'string' }, description: 'Named licenses, regulators, or compliance regimes, e.g. ["FSSAI", "GST", "FDA"].' },
    },
    required: ['countries', 'industries', 'licenses'],
  },
};

async function extractTags(text) {
  if (!text || !text.trim()) return [];
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        tools: [TAG_TOOL],
        tool_choice: { type: 'tool', name: 'extract_tags' },
        messages: [{ role: 'user', content: text }],
      }),
    });
    const data = await res.json();
    const toolUse = data.content?.find(b => b.type === 'tool_use');
    if (!toolUse) return [];
    const { countries = [], industries = [], licenses = [] } = toolUse.input;
    return [...countries, ...industries, ...licenses].map(t => t.trim().toLowerCase());
  } catch (err) {
    console.error('extractTags error:', err);
    return [];
  }
}

module.exports = { extractTags };
