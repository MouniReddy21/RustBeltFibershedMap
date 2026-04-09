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
      <h1>Create your profile account</h1>
      <p>You can start as a draft profile first, then complete map details later.</p>

      <div className="card" style={{ maxWidth: "520px" }}>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.8rem" }}>
          <button className="btn secondary" type="button" onClick={() => setMode("signup")}>Sign up</button>
          <button className="btn secondary" type="button" onClick={() => setMode("signin")}>Sign in</button>
        </div>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.65rem" }}>
          {mode === "signup" ? (
            <label>
              Full name
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                style={{ width: "100%", marginTop: "0.2rem", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
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
              style={{ width: "100%", marginTop: "0.2rem", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
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
              style={{ width: "100%", marginTop: "0.2rem", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)" }}
            />
          </label>

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
          </button>
          {message ? <p style={{ margin: 0 }}>{message}</p> : null}
        </form>
      </div>

      <p style={{ marginTop: "0.9rem" }}>
        Looking to submit directly? <Link href="/submit">Open intake form</Link>.
      </p>
    </main>
  );
}
