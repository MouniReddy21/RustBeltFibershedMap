import { z } from "zod";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
    return NextResponse.json({ error: "Invalid relay request." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("contact_relay_emails")
    .insert({
      to_organization_id: parsed.data.toOrganizationId,
      from_organization_id: parsed.data.fromOrganizationId ?? null,
      from_name: parsed.data.fromName,
      from_email: parsed.data.fromEmail,
      subject: parsed.data.subject ?? null,
      message_body: parsed.data.messageBody,
      status: "queued"
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "Unable to queue relay email." }, { status: 500 });
  }

  return NextResponse.json({ queued: true, relayId: data.id }, { status: 201 });
}
