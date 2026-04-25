import Link from "next/link";

const DONATION_CONTACT = {
  name: "Sarah",
  email: "sarah@rustbeltfibershed.org",
};

export default function SubmitConfirmPage() {
  return (
    <main>
      <div className="card" style={{ maxWidth: "560px", padding: "2rem" }}>
        <p style={{ fontSize: "2.5rem", margin: "0 0 0.75rem", lineHeight: 1 }}>🌿</p>
        <h1 style={{ margin: "0 0 0.75rem", fontSize: "1.6rem" }}>
          Welcome to the Rust Belt Fibershed community.
        </h1>
        <p style={{ margin: "0 0 0.75rem", lineHeight: 1.65, color: "var(--muted)" }}>
          You are now part of a growing network of farmers, makers, mills, and advocates building a local
          textile economy. We are glad you are here.
        </p>
        <p style={{ margin: "0 0 1.5rem", lineHeight: 1.65, fontSize: "0.9rem", color: "var(--muted)" }}>
          If you&rsquo;d like to support this nonprofit, even a small contribution helps keep the map free and
          open for everyone — but there is no pressure. Reach out to {DONATION_CONTACT.name} to learn more about donating.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <a className="btn btn-brown" href={`mailto:${DONATION_CONTACT.email}?subject=Donation%20inquiry`}>
            Support the map — contact {DONATION_CONTACT.name}
          </a>
          <Link className="btn secondary" href="/map">
            Explore the map
          </Link>
        </div>
      </div>

      <div className="card" style={{ maxWidth: "560px", marginTop: "1rem", background: "var(--panel)", border: "1px solid var(--border)" }}>
        <p style={{ margin: "0 0 0.4rem", fontWeight: 700, fontSize: "0.95rem" }}>Want to manage your listing?</p>
        <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", lineHeight: 1.65, color: "var(--muted)" }}>
          Create a free account to edit your profile, post to the exchange board, and keep your listing up to date.
          Once your listing is approved, sign in and go to <strong>My Profile</strong> to make changes.
        </p>
        <Link className="btn" href="/join">
          Create an account
        </Link>
      </div>
    </main>
  );
}
