// middleware/requireAdmin.js
//
// Protects internal/admin routes (lead exports, summary counts, etc).
// Today these routes are called directly by crm.html, which is a static
// file with no login step — so this checks a shared secret sent as a
// header instead of a full user session. It's a stopgap, not the final
// state: see the note at the bottom of this file for the real fix.

function requireAdmin(req, res, next) {
  const provided = req.headers['x-admin-key'];
  const expected = process.env.ADMIN_API_KEY;

  if (!expected) {
    // Fail closed: if the env var isn't set, nobody gets in — this
    // prevents accidentally deploying with the routes wide open again.
    console.error('[requireAdmin] ADMIN_API_KEY is not set in the environment.');
    return res.status(500).json({ error: 'Admin access is not configured on this server.' });
  }

  if (!provided || provided !== expected) {
    console.warn(`[requireAdmin] Blocked request to ${req.originalUrl} — missing/invalid x-admin-key`);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

module.exports = requireAdmin;

