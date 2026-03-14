/**
 * Email templates for Accountant Client Invitations
 */

// ─── Shared layout helpers ───────────────────────────────────────────

const BRAND_COLOR = '#1976D2';
const ACCENT_COLOR = '#16a34a'; // Green for YaadBooks
const TEXT_COLOR = '#333333';
const MUTED_COLOR = '#666666';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:${ACCENT_COLOR};padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">YaadBooks</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;color:${TEXT_COLOR};font-size:15px;line-height:1.6;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:${MUTED_COLOR};text-align:center;">
                &copy; ${new Date().getFullYear()} YaadBooks &mdash; Jamaica-First Accounting
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(text: string, url: string, color: string = ACCENT_COLOR): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="background-color:${color};border-radius:6px;">
      <a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">${escapeHtml(text)}</a>
    </td>
  </tr>
</table>`;
}

// ─── Template: Accountant Invitation ─────────────────────────────────

export interface AccountantInvitationEmailParams {
  accountantName: string;
  accountantEmail: string;
  clientBusinessName: string;
  clientOwnerName: string;
  acceptUrl: string;
  expiresInDays: number;
  personalMessage?: string;
}

export function accountantInvitationEmail(params: AccountantInvitationEmailParams) {
  const {
    accountantName,
    accountantEmail,
    clientBusinessName,
    clientOwnerName,
    acceptUrl,
    expiresInDays,
    personalMessage,
  } = params;

  const subject = `${accountantName} wants to manage your books on YaadBooks`;

  const messageSection = personalMessage
    ? `<div style="background-color:#f0f7ff;border-left:4px solid ${BRAND_COLOR};padding:16px;margin:20px 0;border-radius:0 6px 6px 0;">
        <p style="margin:0;font-style:italic;color:${TEXT_COLOR};">"${escapeHtml(personalMessage)}"</p>
        <p style="margin:8px 0 0 0;font-size:13px;color:${MUTED_COLOR};">&mdash; ${escapeHtml(accountantName)}</p>
      </div>`
    : '';

  const body = `
    <p>Dear ${escapeHtml(clientOwnerName)},</p>
    
    <p><strong>${escapeHtml(accountantName)}</strong> (${escapeHtml(accountantEmail)}) has invited you to connect your YaadBooks account so they can help manage your books for <strong>${escapeHtml(clientBusinessName)}</strong>.</p>
    
    ${messageSection}
    
    <div style="background-color:#fef3c7;border:1px solid #fcd34d;border-radius:6px;padding:16px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#92400e;">
        <strong>What this means:</strong>
      </p>
      <ul style="margin:12px 0 0 0;padding-left:20px;color:#92400e;font-size:14px;">
        <li style="margin-bottom:6px;">Your accountant will be able to view your financial data</li>
        <li style="margin-bottom:6px;">They can help with bookkeeping, reconciliation, and reports</li>
        <li style="margin-bottom:6px;">You remain in full control of your business</li>
        <li>You can revoke access at any time</li>
      </ul>
    </div>
    
    ${button('Accept Invitation', acceptUrl)}
    
    <p style="color:${MUTED_COLOR};font-size:13px;">This invitation will expire in <strong>${expiresInDays} days</strong>. If you didn't expect this invitation or don't recognize the sender, you can safely ignore this email.</p>
    
    <p style="margin-top:24px;">Regards,<br />The YaadBooks Team</p>
  `;

  const text = [
    `Dear ${clientOwnerName},`,
    '',
    `${accountantName} (${accountantEmail}) has invited you to connect your YaadBooks account so they can help manage your books for ${clientBusinessName}.`,
    '',
    personalMessage ? `Personal message: "${personalMessage}"` : '',
    '',
    'What this means:',
    '- Your accountant will be able to view your financial data',
    '- They can help with bookkeeping, reconciliation, and reports',
    '- You remain in full control of your business',
    '- You can revoke access at any time',
    '',
    `Accept this invitation: ${acceptUrl}`,
    '',
    `This invitation will expire in ${expiresInDays} days.`,
    '',
    "If you didn't expect this invitation or don't recognize the sender, you can safely ignore this email.",
    '',
    'Regards,',
    'The YaadBooks Team',
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, html: layout(subject, body), text };
}

// ─── Template: Invitation Accepted Notification ──────────────────────

export interface InvitationAcceptedEmailParams {
  accountantName: string;
  clientBusinessName: string;
  clientOwnerName: string;
  clientEmail: string;
  dashboardUrl: string;
}

export function invitationAcceptedEmail(params: InvitationAcceptedEmailParams) {
  const {
    accountantName,
    clientBusinessName,
    clientOwnerName,
    clientEmail,
    dashboardUrl,
  } = params;

  const subject = `${clientBusinessName} has accepted your invitation`;

  const body = `
    <p>Hello ${escapeHtml(accountantName)},</p>
    
    <p>Great news! <strong>${escapeHtml(clientOwnerName)}</strong> from <strong>${escapeHtml(clientBusinessName)}</strong> has accepted your invitation to connect on YaadBooks.</p>
    
    <div style="background-color:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:20px;margin:20px 0;text-align:center;">
      <p style="margin:0;font-size:14px;color:${TEXT_COLOR};">Client Connected</p>
      <p style="margin:8px 0 0 0;font-size:20px;font-weight:700;color:${ACCENT_COLOR};">${escapeHtml(clientBusinessName)}</p>
      <p style="margin:4px 0 0 0;font-size:14px;color:${MUTED_COLOR};">${escapeHtml(clientEmail)}</p>
    </div>
    
    <p>You can now access their books from your accountant dashboard.</p>
    
    ${button('Go to Dashboard', dashboardUrl)}
    
    <p>Regards,<br />The YaadBooks Team</p>
  `;

  const text = [
    `Hello ${accountantName},`,
    '',
    `Great news! ${clientOwnerName} from ${clientBusinessName} has accepted your invitation to connect on YaadBooks.`,
    '',
    'You can now access their books from your accountant dashboard.',
    '',
    `Dashboard: ${dashboardUrl}`,
    '',
    'Regards,',
    'The YaadBooks Team',
  ].join('\n');

  return { subject, html: layout(subject, body), text };
}

// ─── Template: Invitation Resent ─────────────────────────────────────

export interface InvitationResentEmailParams {
  accountantName: string;
  accountantEmail: string;
  clientBusinessName: string;
  clientOwnerName: string;
  acceptUrl: string;
  expiresInDays: number;
}

export function invitationResentEmail(params: InvitationResentEmailParams) {
  const {
    accountantName,
    accountantEmail,
    clientBusinessName,
    clientOwnerName,
    acceptUrl,
    expiresInDays,
  } = params;

  const subject = `Reminder: ${accountantName} wants to manage your books on YaadBooks`;

  const body = `
    <p>Dear ${escapeHtml(clientOwnerName)},</p>
    
    <p>This is a reminder that <strong>${escapeHtml(accountantName)}</strong> (${escapeHtml(accountantEmail)}) has invited you to connect your YaadBooks account for <strong>${escapeHtml(clientBusinessName)}</strong>.</p>
    
    <p>If you haven't had a chance to respond yet, you can accept the invitation using the button below:</p>
    
    ${button('Accept Invitation', acceptUrl)}
    
    <p style="color:${MUTED_COLOR};font-size:13px;">This invitation will expire in <strong>${expiresInDays} days</strong>.</p>
    
    <p>Regards,<br />The YaadBooks Team</p>
  `;

  const text = [
    `Dear ${clientOwnerName},`,
    '',
    `This is a reminder that ${accountantName} (${accountantEmail}) has invited you to connect your YaadBooks account for ${clientBusinessName}.`,
    '',
    `Accept this invitation: ${acceptUrl}`,
    '',
    `This invitation will expire in ${expiresInDays} days.`,
    '',
    'Regards,',
    'The YaadBooks Team',
  ].join('\n');

  return { subject, html: layout(subject, body), text };
}
