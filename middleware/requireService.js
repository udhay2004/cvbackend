// middleware/requireService.js
//
// Separate from requireAdmin: that one gates browser->backend admin calls
// with a key typed by a human. This gates server->server calls (currently
// just the chatbot posting new campaigns) with a key that lives only in
// two backend .env files, never in a browser. Keeping them separate means
// rotating one doesn't break the other.

function requireService(req, res, next) {
  const provided = req.headers['x-service-key'];
  const expected = process.env.SERVICE_API_KEY;

  if (!expected) {
    console.error('[requireService] SERVICE_API_KEY is not set in the environment.');
    return res.status(500).json({ error: 'Service access is not configured on this server.' });
  }

  if (!provided || provided !== expected) {
    console.warn(`[requireService] Blocked request to ${req.originalUrl} — missing/invalid x-service-key`);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

module.exports = requireService;
