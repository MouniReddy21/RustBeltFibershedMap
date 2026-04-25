"use client";

import { FormEvent, useState } from "react";

type Props = {
  postTitle: string;
  toOrganizationId: string;
  businessName: string;
};

export default function PostContactButton({ postTitle, toOrganizationId, businessName }: Props) {
  const [open, setOpen] = useState(false);
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError("");

    const response = await fetch("/api/contact/relay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toOrganizationId,
        fromName,
        fromEmail,
        subject: `Re: ${postTitle}`,
        messageBody: message,
      }),
    });

    setSending(false);

    if (!response.ok) {
      setError("Unable to send right now. Please try again.");
      return;
    }

    setSent(true);
    setOpen(false);
  }

  if (sent) {
    return (
      <span style={{ fontSize: "0.82rem", color: "var(--muted)", padding: "0.35rem 0", display: "inline-block" }}>
        Message sent to {businessName}.
      </span>
    );
  }

  return (
    <div style={{ marginTop: "0.5rem" }}>
      <button
        type="button"
        className="btn secondary"
        style={{ fontSize: "0.82rem", padding: "0.35rem 0.75rem" }}
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? "Cancel" : "Contact about this post"}
      </button>

      {open && (
        <form
          onSubmit={onSubmit}
          style={{ marginTop: "0.75rem", display: "grid", gap: "0.5rem" }}
        >
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>
            Re: <em>{postTitle}</em> — your message is relayed to {businessName}.
            Their email is never shared.
          </p>
          <label style={{ fontSize: "0.9rem", display: "grid", gap: "0.2rem" }}>
            Your name
            <input
              required
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              style={{ padding: "0.5rem", borderRadius: "8px", border: "1px solid var(--border)" }}
            />
          </label>
          <label style={{ fontSize: "0.9rem", display: "grid", gap: "0.2rem" }}>
            Your email
            <input
              required
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              style={{ padding: "0.5rem", borderRadius: "8px", border: "1px solid var(--border)" }}
            />
          </label>
          <label style={{ fontSize: "0.9rem", display: "grid", gap: "0.2rem" }}>
            Message
            <textarea
              required
              minLength={10}
              maxLength={5000}
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{
                padding: "0.5rem",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                resize: "vertical",
              }}
            />
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn" type="submit" disabled={sending} style={{ fontSize: "0.9rem" }}>
              {sending ? "Sending…" : "Send message"}
            </button>
            <button
              type="button"
              className="btn secondary"
              style={{ fontSize: "0.9rem" }}
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>
          {error && (
            <p style={{ margin: 0, fontSize: "0.85rem", color: "#c0392b" }}>{error}</p>
          )}
        </form>
      )}
    </div>
  );
}
