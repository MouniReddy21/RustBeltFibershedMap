"use client";

import { useState } from "react";

type ReviewControlsProps = {
  approvalId: string;
  hasCoordinates?: boolean;
  city?: string;
  state?: string;
};

export default function ReviewControls({ approvalId, hasCoordinates = true, city = "", state = "" }: ReviewControlsProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [coordsSet, setCoordsSet] = useState(hasCoordinates);

  async function submit(action: "approve" | "reject" | "geocode") {
    setLoading(true);
    setStatus("");

    const response = await fetch(`/api/admin/submissions/${approvalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, rejectionReason })
    });

    setLoading(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus(payload?.error ?? "Unable to complete action.");
      return;
    }

    if (action === "geocode") {
      const payload = (await response.json().catch(() => null)) as { lat?: number; lng?: number } | null;
      setCoordsSet(true);
      setStatus(`Geocoded: ${payload?.lat?.toFixed(4)}, ${payload?.lng?.toFixed(4)}`);
      return;
    }

    setStatus(action === "approve" ? "Submission approved." : "Submission rejected.");
  }

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      {!coordsSet && (
        <div style={{ padding: "0.65rem 0.85rem", borderRadius: "8px", background: "#fdf8ec", border: "1px solid #e0c060", color: "#5a3e00" }}>
          <p style={{ margin: "0 0 0.5rem", fontWeight: 600, fontSize: "0.9rem" }}>
            No coordinates — this listing won&apos;t appear on the map
          </p>
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.85rem" }}>
            Set map coordinates from city: <strong>{city}, {state}</strong>
          </p>
          <button
            className="btn secondary"
            disabled={loading}
            type="button"
            onClick={() => submit("geocode")}
          >
            Geocode city coordinates
          </button>
        </div>
      )}

      <textarea
        rows={3}
        value={rejectionReason}
        onChange={(event) => setRejectionReason(event.target.value)}
        placeholder="Rejection reason (required only for reject)"
        style={{ width: "100%", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.6rem", fontFamily: "inherit" }}
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
