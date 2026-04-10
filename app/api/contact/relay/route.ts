import { z } from "zod";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendResendEmail } from "@/lib/email/resend";
import { buildContactRelayEmail } from "@/lib/email/contact-relay";

const relaySchema = z.object({
  toOrganizationId: z.string().uuid(),
  fromOrganizationId: z.string().uuid().optional(),
  fromName: z.string().min(2).max(120),
  fromEmail: z.string().email(),
  subject: z.string().max(200).optional(),
  messageBody: z.string().min(10).max(5000)
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = relaySchema.safeParse(payload);

  if (!parsed.success) {
    console.error("[relay] Validation failed:", parsed.error.flatten());
    return NextResponse.json({ error: "Invalid relay request." }, { status: 400 });
  }

  let supabase: ReturnType<typeof createSupabaseAdminClient>;
  try {
    supabase = createSupabaseAdminClient();
  } catch (e) {
    console.error("[relay] Admin client init failed — is SUPABASE_SERVICE_ROLE_KEY set?", e);
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const input = parsed.data;

  // Fetch the recipient org's email and name
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("email, business_name")
    .eq("id", input.toOrganizationId)
    .maybeSingle();

  if (orgError) {
    console.error("[relay] Org lookup error:", orgError.message);
    return NextResponse.json({ error: "Unable to process request." }, { status: 500 });
  }

  if (!org) {
    console.error("[relay] Recipient org not found:", input.toOrganizationId);
    return NextResponse.json({ error: "Recipient not found." }, { status: 404 });
  }

  // Log the message to the relay table first
  const { data: relayRow, error: insertError } = await supabase
    .from("contact_relay_emails")
    .insert({
      to_organization_id: input.toOrganizationId,
      from_organization_id: input.fromOrganizationId ?? null,
      from_name: input.fromName,
      from_email: input.fromEmail,
      subject: input.subject ?? null,
      message_body: input.messageBody,
      status: "queued"
    })
    .select("id")
    .single();

  if (insertError || !relayRow) {
    console.error("[relay] Insert failed:", insertError?.message);
    return NextResponse.json({ error: "Unable to log relay message." }, { status: 500 });
  }

  // Send the email via Resend
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

  const { subject, html, text } = buildContactRelayEmail({
    recipientBusinessName: org.business_name,
    fromName: input.fromName,
    fromEmail: input.fromEmail,
    subject: input.subject ?? null,
    messageBody: input.messageBody,
    siteUrl,
  });

  const sendResult = await sendResendEmail({
    to: org.email,
    subject,
    html,
    text,
  });

  // Update relay row with delivery status
  await supabase
    .from("contact_relay_emails")
    .update({ status: sendResult.ok ? "sent" : "failed" })
    .eq("id", relayRow.id);

  if (!sendResult.ok) {
    // Message was logged but email failed — still tell the user it worked
    // so we don't expose internal errors. Admins can see failed rows in the DB.
    console.error(`[relay] Email send failed for relay ${relayRow.id}: ${sendResult.error}`);
  }

  return NextResponse.json({ sent: true, relayId: relayRow.id }, { status: 201 });
}
