// services/notify.js
//
// All outbound email for the partner-linkage flow, via Resend (already an
// installed dependency, previously unused in this repo).
//
// Required env vars:
//   RESEND_API_KEY     - same key you'd use anywhere else with Resend
//   FROM_EMAIL          - e.g. "Connect Ventures <notifications@theconnectventures.com>"
//   ADMIN_NOTIFY_EMAIL  - where "a campaign is waiting for approval" emails go
//   ADMIN_APPROVE_URL   - optional, base URL of your admin UI, e.g.
//                          "https://theconnectventures.com/crm.html" — used to
//                          build a direct link in the admin notification email.

const { Resend } = require('resend');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Connect Ventures <notifications@theconnectventures.com>';
const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL;
const ADMIN_APPROVE_URL = process.env.ADMIN_APPROVE_URL || '';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

async function send({ to, subject, html }) {
  if (!resend) {
    console.error('[notify] RESEND_API_KEY not set — skipping email:', subject);
    return;
  }
  try {
    const { error } = await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
    if (error) console.error('[notify] Resend error:', error);
  } catch (err) {
    console.error('[notify] send failed:', err.message);
  }
}

function wrap(title, bodyHtml) {
  return (
    '<div style="font-family:Arial,sans-serif;max-width:640px;color:#222">' +
    `<h2 style="color:#0057c2">${title}</h2>` +
    bodyHtml +
    '</div>'
  );
}

// Sent to you (ADMIN_NOTIFY_EMAIL) the moment the chatbot creates a pending campaign.
async function notifyAdminPendingCampaign(campaign) {
  if (!ADMIN_NOTIFY_EMAIL) {
    console.error('[notify] ADMIN_NOTIFY_EMAIL not set — skipping admin pending-campaign email.');
    return;
  }
  const html = wrap('New campaign awaiting approval', `
    <p><strong>${campaign.title}</strong></p>
    <p>${campaign.originCountry} → ${campaign.destCountry} · ${campaign.topic} · ${campaign.license}</p>
    <p style="color:#555">${campaign.blurb}</p>
    <p>Tags: ${(campaign.extractedTags || []).join(', ') || '—'}</p>
    <p>Contact on file: ${campaign.contactEmail || 'none'}</p>
    ${ADMIN_APPROVE_URL ? `<p><a href="${ADMIN_APPROVE_URL}?slug=${campaign.slug}">Review &amp; approve</a></p>` : ''}
  `);
  await send({ to: ADMIN_NOTIFY_EMAIL, subject: `Pending campaign: ${campaign.title}`, html });
}

// Sent to each matched partner once you approve the campaign.
async function notifyPartnerMatch(partner, campaign) {
  const html = wrap("There's a query that matches what you do", `
    <p>Hi ${partner.name},</p>
    <p>Someone on Connect Ventures is looking for help with:</p>
    <p><strong>${campaign.title}</strong></p>
    <p>${campaign.originCountry} → ${campaign.destCountry} · ${campaign.topic} · ${campaign.license}</p>
    <p style="color:#555">${campaign.blurb}</p>
    <p>Reply to this email or reach out directly to get connected.</p>
  `);
  await send({ to: partner.email, subject: `New match: ${campaign.title}`, html });
}

// Sent to the person who submitted the query, once you approve it.
async function notifySubmitterApproved(campaign, matchedCount) {
  if (!campaign.contactEmail) return;
  const html = wrap("We're on it", `
    <p>Your request — <strong>${campaign.title}</strong> — has been shared with
    ${matchedCount > 0 ? `${matchedCount} partner(s) in our network who work in this area` : 'our partner network'}.
    ${matchedCount > 0 ? 'Expect outreach directly from them soon.' : "We'll follow up if a match comes in."}</p>
  `);
  await send({ to: campaign.contactEmail, subject: `Update on your request: ${campaign.title}`, html });
}

module.exports = { notifyAdminPendingCampaign, notifyPartnerMatch, notifySubmitterApproved };
