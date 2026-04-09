"use client";

import { FormEvent, useState } from "react";

type RelayFormProps = {
  toOrganizationId: string;
  businessName: string;
};

export default function RelayForm({ toOrganizationId, businessName }: RelayFormProps) {
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [status, setStatus] = useState<string>("");
  const [sending, setSending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setStatus("");

    const response = await fetch("/api/contact/relay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toOrganizationId,
        fromName,
        fromEmail,
        subject,
        messageBody
      })
    });

    setSending(false);

    if (!response.ok) {
      setStatus("Unable to send message right now. Please try again.");
      return;
    }

    setFromName("");
    setFromEmail("");
    setSubject("");
    setMessageBody("");
    setStatus(`Message sent to ${businessName}.`);
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.6rem" }}>
      <label>
        Your name
        <input
          required
          value={fromName}
          onChange={(event) => setFromName(event.target.value)}
          style={{ width: "100%", marginTop: "0.25rem", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
        />
      </label>
      <label>
        Your email
        <input
          required
          type="email"
          value={fromEmail}
          onChange={(event) => setFromEmail(event.target.value)}
          style={{ width: "100%", marginTop: "0.25rem", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
        />
      </label>
      <label>
        Subject (optional)
        <input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          style={{ width: "100%", marginTop: "0.25rem", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
        />
      </label>
      <label>
        Message
        <textarea
          required
          minLength={10}
          maxLength={5000}
          rows={5}
          value={messageBody}
          onChange={(event) => setMessageBody(event.target.value)}
          style={{ width: "100%", marginTop: "0.25rem", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
        />
      </label>
      <button className="btn" type="submit" disabled={sending}>
        {sending ? "Sending..." : "Send message"}
      </button>
      {status ? <p style={{ margin: 0 }}>{status}</p> : null}
    </form>
  );
}
