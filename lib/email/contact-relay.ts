type ContactRelayParams = {
  recipientBusinessName: string;
  fromName: string;
  fromEmail: string;
  subject: string | null;
  messageBody: string;
  siteUrl: string;
};

export function buildContactRelayEmail(params: ContactRelayParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { recipientBusinessName, fromName, fromEmail, subject, messageBody, siteUrl } = params;

  const emailSubject = subject
    ? `Message via Fibershed Map — ${subject}`
    : `Someone contacted you via the Rust Belt Fibershed Map`;

  // Escape HTML special chars in user-supplied content
  function esc(s: string) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const escapedMessage = esc(messageBody).replace(/\n/g, "<br />");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(emailSubject)}</title>
</head>
<body style="margin:0;padding:0;background:#f0ead5;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0ead5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:24px;">
              <p style="margin:0;font-family:'Arial',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#c47830;">
                Rust Belt Fibershed · Community Map
              </p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#faf7ec;border:1px solid #d4c5a8;border-radius:14px;padding:32px;">

              <h1 style="margin:0 0 6px;font-size:20px;color:#365e1c;line-height:1.2;">
                You have a new message
              </h1>
              <p style="margin:0 0 24px;font-size:14px;color:#6d645c;">
                Someone contacted you through your listing on the Fibershed Community Map.
              </p>

              <!-- From block -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f0ead5;border:1px solid #d4c5a8;border-radius:10px;margin-bottom:20px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 4px;font-size:12px;font-family:'Arial',sans-serif;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#6d645c;">
                      From
                    </p>
                    <p style="margin:0;font-size:15px;font-weight:600;color:#1f1c1a;">
                      ${esc(fromName)}
                    </p>
                    <p style="margin:2px 0 0;font-size:14px;color:#6d645c;">
                      <a href="mailto:${esc(fromEmail)}" style="color:#5e7a25;text-decoration:none;">
                        ${esc(fromEmail)}
                      </a>
                    </p>
                  </td>
                </tr>
              </table>

              ${subject ? `
              <!-- Subject -->
              <p style="margin:0 0 6px;font-size:12px;font-family:'Arial',sans-serif;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#6d645c;">
                Subject
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#1f1c1a;">${esc(subject)}</p>
              ` : ""}

              <!-- Message -->
              <p style="margin:0 0 6px;font-size:12px;font-family:'Arial',sans-serif;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#6d645c;">
                Message
              </p>
              <div style="background:white;border:1px solid #d4c5a8;border-radius:8px;padding:16px;margin-bottom:24px;font-size:15px;line-height:1.65;color:#1f1c1a;">
                ${escapedMessage}
              </div>

              <!-- Reply CTA -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#5e7a25;border-radius:10px;border:1px solid #365e1c;">
                    <a href="mailto:${esc(fromEmail)}?subject=Re: ${esc(subject ?? "Your Fibershed message")}"
                      style="display:inline-block;padding:12px 24px;font-family:'Arial',sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Reply to ${esc(fromName)} &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#6d645c;line-height:1.6;border-top:1px solid #d4c5a8;padding-top:16px;">
                This message was sent through the
                <a href="${siteUrl}" style="color:#5e7a25;text-decoration:none;">Rust Belt Fibershed Community Map</a>.
                Your email address was not shared with the sender.
                To manage your listing, visit your
                <a href="${siteUrl}/onboarding" style="color:#5e7a25;text-decoration:none;">member profile</a>.
              </p>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
You have a new message via the Rust Belt Fibershed Community Map.

From: ${fromName} <${fromEmail}>
${subject ? `Subject: ${subject}\n` : ""}
Message:
${messageBody}

---
Reply directly to ${fromEmail} to respond.

Your email address was not shared with the sender.
Visit ${siteUrl} to manage your listing.
  `.trim();

  return { subject: emailSubject, html, text };
}
