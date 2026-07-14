// services/notify.js
//
// All outbound email for the partner-linkage flow, via Resend (already an
// installed dependency, previously unused in this repo).
//
// Required env vars:
//   RESEND_API_KEY     - same key you'd use anywhere else with Resend
//   FROM_EMAIL          - e.g. "Connect Ventures <notifications@theconnectventures.com>"
//   ADMIN_NOTIFY_EMAIL  - where "a query is waiting for approval" emails go
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

// Escapes basic HTML so a query's free-text fields (title, blurb, details)
// can't break the email markup or inject links/scripts. Contact info is
// deliberately NOT run through esc() logic differently — same treatment,
// since it's still user-submitted text.
function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Sent to you (ADMIN_NOTIFY_EMAIL) the moment the chatbot creates a pending
// query — i.e. immediately, before any human has looked at it. This is what
// tells you "someone just asked about X" in real time.
async function notifyAdminPendingCampaign(campaign) {
  if (!ADMIN_NOTIFY_EMAIL) {
    console.error('[notify] ADMIN_NOTIFY_EMAIL not set — skipping admin pending-campaign email.');
    return;
  }
  const html = wrap('New partner query awaiting approval', `
    <p><strong>${esc(campaign.title)}</strong></p>
    <p>${esc(campaign.originCountry)} → ${esc(campaign.destCountry)} · ${esc(campaign.topic)} · ${esc(campaign.license)}</p>
    <p style="color:#555">${esc(campaign.blurb)}</p>
    ${campaign.details ? `<p style="color:#555;white-space:pre-wrap">${esc(campaign.details)}</p>` : ''}
    <p>Tags: ${(campaign.extractedTags || []).join(', ') || '—'}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:14px 0">
    <p><strong>Contact on file</strong><br>
    Name: ${esc(campaign.contactName) || 'not given'}<br>
    Email: ${esc(campaign.contactEmail) || 'not given'}<br>
    Phone: ${esc(campaign.contactPhone) || 'not given'}</p>
    ${ADMIN_APPROVE_URL ? `<p><a href="${ADMIN_APPROVE_URL}?slug=${campaign.slug}">Review &amp; approve in the CRM</a></p>` : ''}
  `);
  await send({ to: ADMIN_NOTIFY_EMAIL, subject: `New query: ${campaign.title}`, html });
}

// Sent to each matched partner the moment you approve the query. This is
// the email that actually connects them to the person — it must contain
// the person's real details, not just "reply to this email", or the
// partner has no way to act on it.
async function notifyPartnerMatch(partner, campaign) {
  const contactLines = [
    campaign.contactName ? `Name: ${esc(campaign.contactName)}` : '',
    campaign.contactEmail ? `Email: ${esc(campaign.contactEmail)}` : '',
    campaign.contactPhone ? `Phone: ${esc(campaign.contactPhone)}` : '',
  ].filter(Boolean).join('<br>');

  const html = wrap("There's a query that matches what you do", `
    <p>Hi ${esc(partner.name)},</p>
    <p>Someone came to Connect Ventures looking for help with:</p>
    <p><strong>${esc(campaign.title)}</strong></p>
    <p>${esc(campaign.originCountry)} → ${esc(campaign.destCountry)} · ${esc(campaign.topic)} · ${esc(campaign.license)}</p>
    <p style="color:#555">${esc(campaign.blurb)}</p>
    ${campaign.details ? `<div style="background:#f7f7f7;border-radius:6px;padding:12px 14px;color:#333;white-space:pre-wrap;margin:12px 0">${esc(campaign.details)}</div>` : ''}
    <hr style="border:none;border-top:1px solid #eee;margin:14px 0">
    <p><strong>Reach out directly:</strong><br>${contactLines || 'No contact details on file — reply to this email and we\'ll relay you.'}</p>
  `);
  await send({ to: partner.email, subject: `New match: ${campaign.title}`, html });
}

// Sent to the person who submitted the query, once you approve it.
async function notifySubmitterApproved(campaign, matchedCount) {
  if (!campaign.contactEmail) return; // nothing to send to if they only left a phone number
  const html = wrap("We're on it", `
    <p>Your request — <strong>${esc(campaign.title)}</strong> — has been shared with
    ${matchedCount > 0 ? `${matchedCount} partner(s) in our network who work in this area` : 'our partner network'}.
    ${matchedCount > 0 ? 'Expect outreach directly from them soon.' : "We'll follow up if a match comes in."}</p>
  `);
  await send({ to: campaign.contactEmail, subject: `Update on your request: ${campaign.title}`, html });
}

module.exports = { notifyAdminPendingCampaign, notifyPartnerMatch, notifySubmitterApproved };
