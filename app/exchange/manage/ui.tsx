"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ExchangePost, ExchangePostStatus, ExchangePostType } from "@/lib/types";

type Props = {
  initialPosts: ExchangePost[];
};

type FormState = {
  postType: ExchangePostType;
  title: string;
  description: string;
  fiberCategory: string;
  materialType: string;
  quantity: string;
  priceOrTradeTerms: string;
  expiresAt: string;
};

function toDateInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function toApiDate(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T23:59:59.000Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

const emptyForm: FormState = {
  postType: "offering",
  title: "",
  description: "",
  fiberCategory: "",
  materialType: "",
  quantity: "",
  priceOrTradeTerms: "",
  expiresAt: ""
};

export default function ManageExchangeClient({ initialPosts }: Props) {
  const [posts, setPosts] = useState<ExchangePost[]>(initialPosts);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const activeCount = useMemo(() => posts.filter((post) => post.status === "active").length, [posts]);

  function startEdit(post: ExchangePost) {
    setEditingId(post.id);
    setForm({
      postType: post.post_type,
      title: post.title,
      description: post.description ?? "",
      fiberCategory: post.fiber_category ?? "",
      materialType: post.material_type ?? "",
      quantity: post.quantity ?? "",
      priceOrTradeTerms: post.price_or_trade_terms ?? "",
      expiresAt: toDateInput(post.expires_at)
    });
    setNotice("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function savePost() {
    setSaving(true);
    setNotice("");

    const isEdit = Boolean(editingId);
    const endpoint = isEdit ? `/api/exchange/posts/${editingId}` : "/api/exchange/posts";
    const method = isEdit ? "PATCH" : "POST";
    const basePayload = {
      title: form.title,
      description: form.description || undefined,
      fiberCategory: form.fiberCategory || undefined,
      materialType: form.materialType || undefined,
      quantity: form.quantity || undefined,
      priceOrTradeTerms: form.priceOrTradeTerms || undefined,
      expiresAt: toApiDate(form.expiresAt)
    };
    const payload = isEdit ? basePayload : { ...basePayload, postType: form.postType };

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const json = (await response.json().catch(() => null)) as { error?: string; post?: ExchangePost } | null;

    if (!response.ok || !json?.post) {
      setSaving(false);
      setNotice(json?.error ?? "Unable to save exchange post.");
      return;
    }

    setPosts((current) => {
      if (!isEdit) {
        return [json.post as ExchangePost, ...current];
      }
      return current.map((post) => (post.id === editingId ? (json.post as ExchangePost) : post));
    });

    setSaving(false);
    setNotice(isEdit ? "Post updated." : "Post created.");
    resetForm();
  }

  async function setStatus(postId: string, status: ExchangePostStatus) {
    const response = await fetch(`/api/exchange/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });

    const json = (await response.json().catch(() => null)) as { error?: string; post?: ExchangePost } | null;

    if (!response.ok || !json?.post) {
      setNotice(json?.error ?? "Unable to update status.");
      return;
    }

    setPosts((current) => current.map((post) => (post.id === postId ? (json.post as ExchangePost) : post)));
    setNotice("Status updated.");
  }

  async function removePost(postId: string) {
    const response = await fetch(`/api/exchange/posts/${postId}`, { method: "DELETE" });
    if (!response.ok) {
      setNotice("Unable to delete post.");
      return;
    }
    setPosts((current) => current.filter((post) => post.id !== postId));
    if (editingId === postId) {
      resetForm();
    }
    setNotice("Post deleted.");
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div className="card">
        <p style={{ marginTop: 0 }}>
          <strong>{activeCount}</strong> active posts
        </p>
        <p style={{ marginBottom: 0 }}>
          Need inspiration? Open the <Link href="/exchange">public Exchange Board</Link> to see nearby listings.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>{editingId ? "Edit exchange post" : "Create exchange post"}</h2>
        <div style={{ display: "grid", gap: "0.6rem" }}>
          <label>
            Post type
            <select
              value={form.postType}
              disabled={Boolean(editingId)}
              onChange={(event) => setForm((prev) => ({ ...prev, postType: event.target.value as ExchangePostType }))}
              style={{ width: "100%", marginTop: "0.2rem", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
            >
              <option value="offering">I have</option>
              <option value="wanted">I need</option>
            </select>
          </label>
          <label>
            Title
            <input
              value={form.title}
              maxLength={140}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              style={{ width: "100%", marginTop: "0.2rem", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
            />
          </label>
          <label>
            Description
            <textarea
              rows={4}
              value={form.description}
              maxLength={2000}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              style={{ width: "100%", marginTop: "0.2rem", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
            />
          </label>
          <div style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <label>
              Fiber category
              <input
                value={form.fiberCategory}
                onChange={(event) => setForm((prev) => ({ ...prev, fiberCategory: event.target.value }))}
                style={{ width: "100%", marginTop: "0.2rem", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
              />
            </label>
            <label>
              Material type
              <input
                value={form.materialType}
                onChange={(event) => setForm((prev) => ({ ...prev, materialType: event.target.value }))}
                style={{ width: "100%", marginTop: "0.2rem", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
              />
            </label>
            <label>
              Quantity (optional)
              <input
                value={form.quantity}
                onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
                style={{ width: "100%", marginTop: "0.2rem", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
              />
            </label>
            <label>
              Expires on
              <input
                type="date"
                value={form.expiresAt}
                onChange={(event) => setForm((prev) => ({ ...prev, expiresAt: event.target.value }))}
                style={{ width: "100%", marginTop: "0.2rem", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
              />
            </label>
          </div>
          <label>
            Price or trade terms
            <input
              value={form.priceOrTradeTerms}
              onChange={(event) => setForm((prev) => ({ ...prev, priceOrTradeTerms: event.target.value }))}
              style={{ width: "100%", marginTop: "0.2rem", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
            />
          </label>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button className="btn" type="button" disabled={saving || form.title.trim().length < 3} onClick={savePost}>
              {saving ? "Saving..." : editingId ? "Save changes" : "Create post"}
            </button>
            {editingId ? (
              <button className="btn secondary" type="button" onClick={resetForm}>
                Cancel edit
              </button>
            ) : null}
          </div>
          {notice ? <p style={{ margin: 0 }}>{notice}</p> : null}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Your posts</h2>
        {posts.length === 0 ? <p style={{ marginBottom: 0 }}>No posts yet. Create your first exchange listing above.</p> : null}
        <div style={{ display: "grid", gap: "0.7rem" }}>
          {posts.map((post) => (
            <article key={post.id} style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "0.75rem" }}>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem" }}>
                {post.post_type === "offering" ? "I have" : "I need"} - {post.status}
              </p>
              <h3 style={{ marginTop: "0.25rem", marginBottom: "0.25rem" }}>{post.title}</h3>
              {post.description ? <p style={{ marginTop: 0 }}>{post.description}</p> : null}
              <p style={{ margin: "0 0 0.6rem", fontSize: "0.9rem" }}>
                Expires {new Date(post.expires_at).toLocaleDateString()}.
              </p>
              <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                <button className="btn secondary" type="button" onClick={() => startEdit(post)}>
                  Edit
                </button>
                {post.status === "active" ? (
                  <button className="btn secondary" type="button" onClick={() => setStatus(post.id, "closed")}>
                    Close
                  </button>
                ) : (
                  <button className="btn secondary" type="button" onClick={() => setStatus(post.id, "active")}>
                    Reopen
                  </button>
                )}
                <button className="btn secondary" type="button" onClick={() => removePost(post.id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
