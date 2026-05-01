"use client";

import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function JoinPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signup" | "signin" | "reset" | "update">("signup");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("update");
        setMessage("");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const supabase = createSupabaseBrowserClient();

      if (mode === "update") {
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);
        if (error) {
          setMessage(error.message);
        } else {
          setMessage("Password updated successfully. Taking you to your profile...");
          setTimeout(() => router.push("/onboarding"), 1500);
        }
        return;
      }

      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/join`,
        });
        setLoading(false);
        if (error) {
          setMessage(error.message);
        } else {
          setMessage("Check your email for a password reset link.");
        }
        return;
      }

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

      // Silently link any existing public-form submission that shares this email.
      // Non-blocking — a failure here does not prevent login.
      await fetch("/api/auth/link-submission", { method: "POST" }).catch(() => null);

      router.push("/onboarding");
      router.refresh();
    } catch {
      setMessage("Unable to continue right now.");
    }

    setLoading(false);
  }

  return (
    <main>
      <h1>
        {mode === "signup" ? "Create your account" : mode === "signin" ? "Welcome back" : mode === "reset" ? "Reset your password" : "Set a new password"}
      </h1>
      <p className="page-lead">
        {mode === "signup"
          ? "Start a draft profile and complete your map listing at your own pace."
          : mode === "signin"
          ? "Sign in to manage your profile and listing."
          : mode === "reset"
          ? "Enter your email and we'll send you a reset link."
          : "Choose a new password for your account."}
      </p>

      <div className="card" style={{ maxWidth: "480px" }}>
        {mode !== "reset" && mode !== "update" && (
          <div className="toggle-group">
            <button
              className={`toggle-btn${mode === "signup" ? " active" : ""}`}
              type="button"
              onClick={() => { setMode("signup"); setMessage(""); }}
            >
              Sign up
            </button>
            <button
              className={`toggle-btn${mode === "signin" ? " active" : ""}`}
              type="button"
              onClick={() => { setMode("signin"); setMessage(""); }}
            >
              Sign in
            </button>
          </div>
        )}

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
          {mode !== "update" && (
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
          )}
          {(mode === "signup" || mode === "signin" || mode === "update") && (
            <label>
              {mode === "update" ? "New password" : "Password"}
              <input
                type="password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="field-input"
              />
            </label>
          )}

          <button className="btn" type="submit" disabled={loading} style={{ marginTop: "0.25rem" }}>
            {loading
              ? "Please wait..."
              : mode === "signup"
              ? "Create account"
              : mode === "signin"
              ? "Sign in"
              : mode === "reset"
              ? "Send reset link"
              : "Update password"}
          </button>

          {mode === "signin" && (
            <button
              type="button"
              onClick={() => { setMode("reset"); setMessage(""); }}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "0.85rem", color: "var(--accent-strong)", fontWeight: 600, textAlign: "left" }}
            >
              Forgot your password?
            </button>
          )}

          {mode === "reset" && (
            <button
              type="button"
              onClick={() => { setMode("signin"); setMessage(""); }}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "0.85rem", color: "var(--muted)", textAlign: "left" }}
            >
              Back to sign in
            </button>
          )}

          {message ? <p className={`notice${message.toLowerCase().includes("unable") || message.toLowerCase().includes("invalid") ? " error" : ""}`}>{message}</p> : null}
        </form>
      </div>

      <p style={{ marginTop: "0.9rem", fontSize: "0.9rem", color: "var(--muted)" }}>
        Want to list your project? <Link href="/submit" style={{ color: "var(--accent-strong)", fontWeight: 600 }}>Open the intake form</Link>.
      </p>
    </main>
  );
}
