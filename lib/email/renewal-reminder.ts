type RenewalReminderParams = {
  recipientName: string;
  businessName: string;
  postTitle: string;
  postType: "offering" | "wanted";
  expiresAt: Date;
  manageUrl: string;
};

export function buildRenewalReminderEmail(params: RenewalReminderParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { recipientName, businessName, postTitle, postType, expiresAt, manageUrl } = params;

  const expiryFormatted = expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const postTypeLabel = postType === "offering" ? "I have" : "I need";
  const subject = `Your Fibershed exchange post expires in 7 days`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
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

              <h1 style="margin:0 0 8px;font-size:22px;color:#365e1c;line-height:1.2;">
                Your exchange post expires soon
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#6d645c;line-height:1.6;">
                Hi ${recipientName}, your post on the Fibershed Exchange Board will expire on <strong>${expiryFormatted}</strong>.
              </p>

              <!-- Post card -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f5f9ec;border:1px solid #b8d068;border-radius:10px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0 0 6px;">
                      <span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:700;background:#edf5d8;color:#365e1c;border:1px solid #b8d068;">
                        ${postTypeLabel}
                      </span>
                    </p>
                    <p style="margin:4px 0 0;font-size:16px;font-weight:600;color:#1f1c1a;">
                      ${postTitle}
                    </p>
                    <p style="margin:4px 0 0;font-size:13px;color:#6d645c;">
                      ${businessName}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px;font-size:15px;color:#6d645c;line-height:1.6;">
                If this listing is still relevant, renew it to keep it visible for another 90 days.
                If it&rsquo;s no longer needed, you can close or delete it from your manage page.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#5e7a25;border-radius:10px;border:1px solid #365e1c;">
                    <a href="${manageUrl}"
                      style="display:inline-block;padding:12px 24px;font-family:'Arial',sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Manage my exchange posts &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#6d645c;line-height:1.6;border-top:1px solid #d4c5a8;padding-top:16px;">
                This is an automated reminder from the Rust Belt Fibershed Community Map.
                If you have questions, reply to this email.
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
Hi ${recipientName},

Your exchange post on the Fibershed Exchange Board will expire on ${expiryFormatted}.

Post: "${postTitle}" (${postTypeLabel}) — ${businessName}

If this listing is still relevant, visit your manage page to renew it for another 90 days:
${manageUrl}

If it's no longer needed, you can close or delete it from the same page.

—
Rust Belt Fibershed Community Map
  `.trim();

  return { subject, html, text };
}
