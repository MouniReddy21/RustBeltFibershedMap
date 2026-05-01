"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";

type PostOrg = {
  profile_slug: string | null;
  business_name: string | null;
  city: string | null;
  state: string | null;
};

type Post = {
  id: string;
  organization_id: string;
  post_type: "offering" | "wanted";
  title: string;
  description: string | null;
  material_type: string | null;
  fiber_category: string | null;
  quantity: string | null;
  price_or_trade_terms: string | null;
  photo_urls: string[];
  expires_at: string;
  organizations: PostOrg | PostOrg[] | null;
};

type ContactTarget = {
  postId: string;
  postTitle: string;
  toOrganizationId: string;
  businessName: string;
};

export default function ExchangeBoard({ posts }: { posts: Post[] }) {
  const [contact, setContact] = useState<ContactTarget | null>(null);
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<string | null>(null);

  function openContact(post: Post, org: PostOrg | null) {
    setContact({
      postId: post.id,
      postTitle: post.title,
      toOrganizationId: post.organization_id,
      businessName: org?.business_name ?? "Member",
    });
    setNotice("");
  }

  function closeContact() {
    setContact(null);
    setFromName("");
    setFromEmail("");
    setMessageBody("");
    setNotice("");
  }

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!contact) return;
    setSending(true);
    setNotice("");

    const response = await fetch("/api/contact/relay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toOrganizationId: contact.toOrganizationId,
        fromName,
        fromEmail,
        subject: `Re: ${contact.postTitle}`,
        messageBody,
      }),
    });

    setSending(false);

    if (!response.ok) {
      setNotice("Unable to send right now. Please try again.");
      return;
    }

    setSent((prev) => new Set([...prev, contact.postId]));
    closeContact();
  }

  if (posts.length === 0) {
    return <div className="card">No active exchange posts match your filters.</div>;
  }

  return (
    <>
      <div style={{ display: "grid", gap: "0.75rem" }}>
        {posts.map((post) => {
          const org = Array.isArray(post.organizations) ? post.organizations[0] : post.organizations;
          const profileSlug = org?.profile_slug ?? null;
          const profileHref = profileSlug ? `/profiles/${profileSlug}` : "/map";
          const isOffering = post.post_type === "offering";
          const alreadySent = sent.has(post.id);
          const photos = post.photo_urls ?? [];

          return (
            <article key={post.id} className="card">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "0.2rem 0.6rem",
                    borderRadius: "999px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    background: isOffering ? "#edf5d8" : "#fdf4e0",
                    color: isOffering ? "var(--accent-strong)" : "var(--brown)",
                    border: `1px solid ${isOffering ? "#b8d068" : "#e0c060"}`,
                  }}
                >
                  {isOffering ? "I have" : "I need"}
                </span>
                {post.fiber_category ? (
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{post.fiber_category}</span>
                ) : null}
              </div>

              <h2 style={{ marginTop: 0, marginBottom: "0.35rem", fontSize: "1.05rem" }}>{post.title}</h2>

              {post.description ? (
                <p style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--muted)" }}>
                  {post.description}
                </p>
              ) : null}

              {post.material_type || post.quantity || post.price_or_trade_terms ? (
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", color: "var(--muted)" }}>
                  {[
                    post.material_type ? `Material: ${post.material_type}` : null,
                    post.quantity ? `Qty: ${post.quantity}` : null,
                    post.price_or_trade_terms ? `Terms: ${post.price_or_trade_terms}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}

              {photos.length > 0 ? (
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
                  {photos.map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setLightbox(url)}
                      style={{ padding: 0, background: "none", border: "none", cursor: "pointer" }}
                      aria-label="View photo"
                    >
                      <Image
                        src={url}
                        alt=""
                        width={80}
                        height={80}
                        style={{
                          objectFit: "cover",
                          borderRadius: "6px",
                          border: "1px solid var(--border)",
                          display: "block",
                        }}
                      />
                    </button>
                  ))}
                </div>
              ) : null}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  marginTop: "0.25rem",
                }}
              >
                <span style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: 500 }}>
                  {org?.business_name ?? "Member"}
                  {org?.city ? ` · ${org.city}` : ""}
                  {org?.state ? `, ${org.state}` : ""}
                </span>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  {alreadySent ? (
                    <span style={{ fontSize: "0.85rem", color: "var(--muted)", padding: "0.4rem 0" }}>
                      Message sent
                    </span>
                  ) : (
                    <button
                      className="btn"
                      style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}
                      onClick={() => openContact(post, org ?? null)}
                    >
                      Contact
                    </button>
                  )}
                  <Link
                    className="btn secondary"
                    href={profileHref}
                    style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}
                  >
                    View profile
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Contact modal */}
      {contact ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={closeContact}
        >
          <div
            className="card"
            style={{ width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "0.75rem",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Contact {contact.businessName}</h2>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.85rem", color: "var(--muted)" }}>
                  Re: {contact.postTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={closeContact}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  lineHeight: 1,
                  padding: "0.2rem 0.4rem",
                  color: "var(--muted)",
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={sendMessage} style={{ display: "grid", gap: "0.6rem" }}>
              <label style={{ display: "grid", gap: "0.2rem", fontSize: "0.9rem" }}>
                Your name
                <input
                  required
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  style={{ padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
                />
              </label>
              <label style={{ display: "grid", gap: "0.2rem", fontSize: "0.9rem" }}>
                Your email
                <input
                  required
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  style={{ padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
                />
              </label>
              <label style={{ display: "grid", gap: "0.2rem", fontSize: "0.9rem" }}>
                Message
                <textarea
                  required
                  minLength={10}
                  maxLength={5000}
                  rows={4}
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  style={{
                    padding: "0.6rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    resize: "vertical",
                  }}
                />
              </label>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted)" }}>
                Your message is relayed through the Fibershed platform.{" "}
                {contact.businessName}&apos;s email address is never shared.
              </p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn" type="submit" disabled={sending}>
                  {sending ? "Sending..." : "Send message"}
                </button>
                <button className="btn secondary" type="button" onClick={closeContact}>
                  Cancel
                </button>
              </div>
              {notice ? <p style={{ margin: 0, color: "#c0392b", fontSize: "0.9rem" }}>{notice}</p> : null}
            </form>
          </div>
        </div>
      ) : null}

      {/* Lightbox */}
      {lightbox ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            cursor: "zoom-out",
          }}
          onClick={() => setLightbox(null)}
        >
          <Image
            src={lightbox}
            alt=""
            width={1200}
            height={900}
            style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: "8px", objectFit: "contain", width: "auto", height: "auto" }}
          />
        </div>
      ) : null}
    </>
  );
}
