import Link from "next/link";

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
          open for everyone — but there is no pressure. Reach out to Sarah to learn more about donating.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <a className="btn btn-brown" href="mailto:sarah@rustbeltfibershed.org?subject=Donation%20inquiry">
            Support the map — contact Sarah
          </a>
          <Link className="btn secondary" href="/map">
            Explore the map
          </Link>
        </div>
      </div>
    </main>
  );
}
