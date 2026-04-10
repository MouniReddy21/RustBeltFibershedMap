import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendResendEmail } from "@/lib/email/resend";
import { buildRenewalReminderEmail } from "@/lib/email/renewal-reminder";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ExchangeReminderRow = {
  id: string;
  title: string;
  post_type: "offering" | "wanted";
  expires_at: string;
  organization_id: string;
  organizations:
    | {
        full_name: string;
        email: string;
        business_name: string;
      }
    | Array<{
        full_name: string;
        email: string;
        business_name: string;
      }>;
};

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const cronHeader = request.headers.get("x-cron-secret") ?? "";

  return token === secret || cronHeader === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let supabase;

  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return NextResponse.json({ error: "Admin client not configured." }, { status: 500 });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const reminderWindowIso = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: expiredRows, error: expireError } = await supabase
    .from("exchange_posts")
    .update({ status: "expired" })
    .eq("status", "active")
    .lt("expires_at", nowIso)
    .select("id");

  if (expireError) {
    return NextResponse.json({ error: "Failed to expire old posts." }, { status: 500 });
  }

  const { data: remindRows, error: reminderQueryError } = await supabase
    .from("exchange_posts")
    .select("id, title, post_type, expires_at, organization_id, organizations(full_name, email, business_name)")
    .eq("status", "active")
    .is("renewal_reminded_at", null)
    .gte("expires_at", nowIso)
    .lte("expires_at", reminderWindowIso)
    .limit(250);

  if (reminderQueryError) {
    return NextResponse.json({ error: "Failed to query reminder candidates." }, { status: 500 });
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const reminders = (remindRows ?? []) as ExchangeReminderRow[];
  let remindedCount = 0;
  const failed: Array<{ post_id: string; error: string }> = [];

  for (const row of reminders) {
    const org = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;
    const recipient = org?.email?.trim();

    if (!recipient) {
      failed.push({ post_id: row.id, error: "Organization email missing." });
      continue;
    }

    // Mark before sending — prevents duplicate emails if the job is interrupted
    const { error: markError } = await supabase
      .from("exchange_posts")
      .update({ renewal_reminded_at: new Date().toISOString() })
      .eq("id", row.id);

    if (markError) {
      failed.push({ post_id: row.id, error: `Failed to mark reminded: ${markError.message}` });
      continue;
    }

    const { subject, html, text } = buildRenewalReminderEmail({
      recipientName: org.full_name || org.business_name,
      businessName: org.business_name,
      postTitle: row.title,
      postType: row.post_type,
      expiresAt: new Date(row.expires_at),
      manageUrl: siteUrl ? `${siteUrl}/exchange/manage` : "/exchange/manage",
    });

    const sendResult = await sendResendEmail({ to: recipient, subject, html, text });

    if (!sendResult.ok) {
      failed.push({ post_id: row.id, error: sendResult.error ?? "Email send failed." });
    } else {
      remindedCount++;
    }
  }

  return NextResponse.json({
    expired_count: expiredRows?.length ?? 0,
    reminder_candidates: reminders.length,
    reminded_count: remindedCount,
    reminder_failures: failed,
  });
}
