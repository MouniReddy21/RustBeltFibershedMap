type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

type SendEmailResult = {
  ok: boolean;
  id?: string;
  error?: string;
};

export async function sendResendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return { ok: false, error: "Resend API key or sender email is not configured." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text
    })
  });

  const payload = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;

  if (!response.ok) {
    return { ok: false, error: payload?.message ?? "Resend request failed." };
  }

  return { ok: true, id: payload?.id };
}
