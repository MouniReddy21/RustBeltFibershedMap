"use client";

import { useState } from "react";

type ReviewControlsProps = {
  approvalId: string;
};

export default function ReviewControls({ approvalId }: ReviewControlsProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(action: "approve" | "reject") {
    setLoading(true);
    setStatus("");

    const response = await fetch(`/api/admin/submissions/${approvalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        rejectionReason
      })
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus(payload?.error ?? "Unable to complete review action.");
      return;
    }

    setStatus(action === "approve" ? "Submission approved." : "Submission rejected.");
  }

  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      <textarea
        rows={3}
        value={rejectionReason}
        onChange={(event) => setRejectionReason(event.target.value)}
        placeholder="Rejection reason (required only for reject)"
        style={{ width: "100%", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.6rem" }}
      />
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button className="btn" disabled={loading} type="button" onClick={() => submit("approve")}>
          Approve
        </button>
        <button className="btn secondary" disabled={loading} type="button" onClick={() => submit("reject")}>
          Reject
        </button>
      </div>
      {status ? <p style={{ margin: 0 }}>{status}</p> : null}
    </div>
  );
}
