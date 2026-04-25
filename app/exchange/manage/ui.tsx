"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ExchangePost, ExchangePostStatus, ExchangePostType } from "@/lib/types";

const FIBER_CATEGORIES = [
  "Sheep Wool",
  "Waste Wool",
  "Alpaca",
  "Mohair",
  "Angora",
  "Cashmere",
  "Llama",
  "Cotton",
  "Flax / Linen",
  "Hemp",
  "Nettle",
  "Blended / Mixed",
  "Other",
] as const;

const MAX_PHOTOS = 3;

type Props = {
  initialPosts: ExchangePost[];
  orgId: string;
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
  photoUrls: string[];
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
  expiresAt: "",
  photoUrls: [],
};

export default function ManageExchangeClient({ initialPosts, orgId }: Props) {
  const [posts, setPosts] = useState<ExchangePost[]>(initialPosts);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [notice, setNotice] = useState("");
  // ID of the post currently awaiting delete confirmation. null = no pending delete.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Tracks storage paths queued for deletion. Only deleted after a successful save — never on cancel.
  const photosToDeleteRef = useRef<string[]>([]);

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
      expiresAt: toDateInput(post.expires_at),
      photoUrls: post.photo_urls ?? [],
    });
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setNotice("");
    setConfirmDeleteId(null);
    // Discard queued deletions — user cancelled, so leave storage untouched.
    photosToDeleteRef.current = [];
  }

  async function handlePhotoSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const remaining = MAX_PHOTOS - form.photoUrls.length;
    const toUpload = files.slice(0, remaining);

    if (toUpload.length === 0) {
      setNotice(`Maximum ${MAX_PHOTOS} photos allowed.`);
      return;
    }

    setUploadingPhoto(true);
    setNotice("");

    const supabase = createSupabaseBrowserClient();
    const uploaded: string[] = [];

    for (const file of toUpload) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${orgId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage.from("exchange-photos").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (error) {
        setNotice("One or more photos failed to upload. Please try again.");
        break;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("exchange-photos").getPublicUrl(path);

      uploaded.push(publicUrl);
    }

    setUploadingPhoto(false);
    if (uploaded.length > 0) {
      setForm((prev) => ({ ...prev, photoUrls: [...prev.photoUrls, ...uploaded] }));
    }

    // Reset the file input so the same file can be re-selected if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePhoto(url: string) {
    // Extract the storage path from the public URL: everything after "/exchange-photos/"
    const marker = "/exchange-photos/";
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      photosToDeleteRef.current = [...photosToDeleteRef.current, url.slice(idx + marker.length)];
    }
    setForm((prev) => ({ ...prev, photoUrls: prev.photoUrls.filter((u) => u !== url) }));
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
      expiresAt: toApiDate(form.expiresAt),
      photoUrls: form.photoUrls,
    };
    const payload = isEdit ? basePayload : { ...basePayload, postType: form.postType };

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = (await response.json().catch(() => null)) as { error?: string; post?: ExchangePost } | null;

    if (!response.ok || !json?.post) {
      setSaving(false);
      setNotice(json?.error ?? "Unable to save exchange post.");
      return;
    }

    setPosts((current) => {
      if (!isEdit) return [json.post as ExchangePost, ...current];
      return current.map((post) => (post.id === editingId ? (json.post as ExchangePost) : post));
    });

    // Now that the save succeeded, delete any photos that were removed during this edit session.
    if (photosToDeleteRef.current.length > 0) {
      const supabase = createSupabaseBrowserClient();
      await supabase.storage.from("exchange-photos").remove(photosToDeleteRef.current);
      photosToDeleteRef.current = [];
    }

    setSaving(false);
    setNotice(isEdit ? "Post updated." : "Post created.");
    resetForm();
  }

  async function setStatus(postId: string, status: ExchangePostStatus) {
    const response = await fetch(`/api/exchange/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
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
    if (editingId === postId) resetForm();
    setNotice("Post deleted.");
  }

  const inputStyle = {
    width: "100%",
    marginTop: "0.2rem",
    padding: "0.6rem",
    borderRadius: "8px",
    border: "1px solid var(--border)",
    boxSizing: "border-box" as const,
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div className="card">
        <p style={{ marginTop: 0 }}>
          <strong>{activeCount}</strong> active {activeCount === 1 ? "post" : "posts"}
        </p>
        <p style={{ marginBottom: 0 }}>
          Need inspiration? Open the <Link href="/exchange">public Exchange Board</Link> to see nearby listings.
        </p>
      </div>

      {/* Create / Edit form */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>{editingId ? "Edit exchange post" : "Create exchange post"}</h2>
        <div style={{ display: "grid", gap: "0.6rem" }}>

          {/* Post type */}
          <label>
            Post type
            <select
              value={form.postType}
              disabled={Boolean(editingId)}
              onChange={(e) => setForm((prev) => ({ ...prev, postType: e.target.value as ExchangePostType }))}
              style={inputStyle}
            >
              <option value="offering">I have</option>
              <option value="wanted">I need</option>
            </select>
          </label>

          {/* Title */}
          <label>
            Title
            <input
              value={form.title}
              maxLength={140}
              placeholder="e.g. 300 lbs raw Rambouillet fleece available"
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              style={inputStyle}
            />
            <span style={{ fontSize: "0.78rem", color: "var(--muted)", display: "block", marginTop: "0.2rem" }}>
              {140 - form.title.length} characters remaining
            </span>
          </label>

          {/* Description */}
          <label>
            Description
            <textarea
              rows={4}
              value={form.description}
              maxLength={2000}
              placeholder="Any extra details about condition, shearing date, pickup or shipping options..."
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </label>

          {/* Fiber category + Material type */}
          <div style={{ display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <label>
              Fiber category
              <select
                value={form.fiberCategory}
                onChange={(e) => setForm((prev) => ({ ...prev, fiberCategory: e.target.value }))}
                style={inputStyle}
              >
                <option value="">Select category</option>
                {FIBER_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Material type
              <input
                value={form.materialType}
                placeholder="e.g. raw fleece, roving, yarn"
                onChange={(e) => setForm((prev) => ({ ...prev, materialType: e.target.value }))}
                style={inputStyle}
              />
            </label>

            <label>
              Quantity (optional)
              <input
                value={form.quantity}
                placeholder="e.g. 300 lbs, 10 bags"
                onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
                style={inputStyle}
              />
            </label>

            <label>
              Expires on
              <input
                type="date"
                value={form.expiresAt}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
                style={inputStyle}
              />
            </label>
          </div>

          {/* Price / trade terms */}
          <label>
            Price or trade terms
            <input
              value={form.priceOrTradeTerms}
              placeholder="e.g. $2/lb, open to trade, free to good home"
              onChange={(e) => setForm((prev) => ({ ...prev, priceOrTradeTerms: e.target.value }))}
              style={inputStyle}
            />
          </label>

          {/* Photo upload */}
          <div>
            <p style={{ margin: "0 0 0.4rem", fontWeight: 500, fontSize: "0.9rem" }}>
              Photos{" "}
              <span style={{ fontWeight: 400, color: "var(--muted)" }}>
                (up to {MAX_PHOTOS}, optional)
              </span>
            </p>

            {form.photoUrls.length > 0 ? (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                {form.photoUrls.map((url) => (
                  <div key={url} style={{ position: "relative" }}>
                    <img
                      src={url}
                      alt=""
                      style={{
                        width: "80px",
                        height: "80px",
                        objectFit: "cover",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        display: "block",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(url)}
                      aria-label="Remove photo"
                      style={{
                        position: "absolute",
                        top: "-6px",
                        right: "-6px",
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        background: "#c0392b",
                        color: "#fff",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "0.7rem",
                        lineHeight: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {form.photoUrls.length < MAX_PHOTOS ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploadingPhoto}
                  onChange={handlePhotoSelect}
                  style={{ display: "none" }}
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="btn secondary"
                  style={{
                    display: "inline-block",
                    cursor: uploadingPhoto ? "wait" : "pointer",
                    opacity: uploadingPhoto ? 0.6 : 1,
                    fontSize: "0.9rem",
                  }}
                >
                  {uploadingPhoto ? "Uploading..." : "Add photo"}
                </label>
                <span style={{ marginLeft: "0.5rem", fontSize: "0.8rem", color: "var(--muted)" }}>
                  JPG, PNG, WEBP · max 5 MB each
                </span>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)" }}>
                Maximum {MAX_PHOTOS} photos reached.
              </p>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <button
              className="btn"
              type="button"
              disabled={saving || uploadingPhoto || form.title.trim().length < 3}
              onClick={savePost}
            >
              {saving ? "Saving..." : editingId ? "Save changes" : "Create post"}
            </button>
            {editingId ? (
              <button className="btn secondary" type="button" onClick={resetForm}>
                Cancel edit
              </button>
            ) : null}
            {form.title.trim().length < 3 && (
              <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                Title must be at least 3 characters to post.
              </span>
            )}
          </div>

          {notice ? (
            <p style={{ margin: 0, color: notice.includes("ailed") ? "#c0392b" : "inherit" }}>{notice}</p>
          ) : null}
        </div>
      </div>

      {/* Post list */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Your posts</h2>
        {posts.length === 0 ? (
          <p style={{ marginBottom: 0 }}>No posts yet. Create your first exchange listing above.</p>
        ) : null}
        <div style={{ display: "grid", gap: "0.7rem" }}>
          {posts.map((post) => (
            <article
              key={post.id}
              style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "0.75rem" }}
            >
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem" }}>
                {post.post_type === "offering" ? "I have" : "I need"} ·{" "}
                <span style={{ textTransform: "capitalize" }}>{post.status}</span>
                {post.fiber_category ? ` · ${post.fiber_category}` : ""}
              </p>
              <h3 style={{ marginTop: "0.25rem", marginBottom: "0.25rem" }}>{post.title}</h3>
              {post.description ? (
                <p style={{ marginTop: 0, marginBottom: "0.4rem", fontSize: "0.9rem" }}>{post.description}</p>
              ) : null}
              {post.photo_urls?.length > 0 ? (
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                  {post.photo_urls.map((url) => (
                    <img
                      key={url}
                      src={url}
                      alt=""
                      style={{
                        width: "60px",
                        height: "60px",
                        objectFit: "cover",
                        borderRadius: "5px",
                        border: "1px solid var(--border)",
                      }}
                    />
                  ))}
                </div>
              ) : null}
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
                {confirmDeleteId === post.id ? (
                  <>
                    <span style={{ fontSize: "0.85rem", color: "#7f1d1d", alignSelf: "center" }}>
                      Delete this post?
                    </span>
                    <button
                      className="btn"
                      type="button"
                      style={{ background: "#c0392b", borderColor: "#c0392b" }}
                      onClick={() => { setConfirmDeleteId(null); removePost(post.id); }}
                    >
                      Yes, delete
                    </button>
                    <button
                      className="btn secondary"
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => setConfirmDeleteId(post.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
