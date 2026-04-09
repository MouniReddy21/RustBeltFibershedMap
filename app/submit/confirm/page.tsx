import Link from "next/link";

export default function SubmitConfirmPage() {
  return (
    <main>
      <div className="card">
        <h1>Welcome to the Rust Belt Fibershed community.</h1>
        <p>
          You are now part of a growing network of farmers, makers, mills, and advocates building a local
          textile economy. We are glad you are here.
        </p>
        <p>
          If you would like to support this nonprofit, even a small contribution helps keep the map free and
          open for everyone, but there is no pressure.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <a className="btn" href={process.env.NEXT_PUBLIC_DONATION_URL ?? "#"}>
            Make an optional donation
          </a>
          <Link className="btn secondary" href="/map">
            Go explore the map
          </Link>
        </div>
      </div>
    </main>
  );
}
