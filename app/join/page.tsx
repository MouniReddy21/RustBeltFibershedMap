"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function JoinPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName
            }
          }
        });

        if (error) {
          setMessage(error.message);
          setLoading(false);
          return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setMessage("Account created. Please sign in to continue.");
          setMode("signin");
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setMessage(error.message);
          setLoading(false);
          return;
        }
      }

      router.push("/onboarding");
      router.refresh();
    } catch {
      setMessage("Unable to continue right now.");
    }

    setLoading(false);
  }

  return (
    <main>
      <h1>{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
      <p className="page-lead">
        {mode === "signup"
          ? "Start a draft profile and complete your map listing at your own pace."
          : "Sign in to manage your profile and listing."}
      </p>

      <div className="card" style={{ maxWidth: "480px" }}>
        <div className="toggle-group">
          <button
            className={`toggle-btn${mode === "signup" ? " active" : ""}`}
            type="button"
            onClick={() => setMode("signup")}
          >
            Sign up
          </button>
          <button
            className={`toggle-btn${mode === "signin" ? " active" : ""}`}
            type="button"
            onClick={() => setMode("signin")}
          >
            Sign in
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.75rem" }}>
          {mode === "signup" ? (
            <label>
              Full name
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="field-input"
              />
            </label>
          ) : null}
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="field-input"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field-input"
            />
          </label>

          <button className="btn" type="submit" disabled={loading} style={{ marginTop: "0.25rem" }}>
            {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
          </button>
          {message ? <p className={`notice${message.toLowerCase().includes("unable") || message.toLowerCase().includes("invalid") ? " error" : ""}`}>{message}</p> : null}
        </form>
      </div>

      <p style={{ marginTop: "0.9rem", fontSize: "0.9rem", color: "var(--muted)" }}>
        Want to list your project? <Link href="/submit" style={{ color: "var(--accent-strong)", fontWeight: 600 }}>Open the intake form</Link>.
      </p>
    </main>
  );
}
