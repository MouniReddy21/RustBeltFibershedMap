import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>Rust Belt Fibershed Platform</h1>
      <p>
        MVP foundation is now live: map + directory, submit flow, profile route, admin queue, and API
        scaffolding.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <Link className="btn" href="/map">
          Explore the Map
        </Link>
        <Link className="btn secondary" href="/join">
          Join / Sign In
        </Link>
        <Link className="btn secondary" href="/onboarding">
          Create Draft Profile
        </Link>
        <Link className="btn secondary" href="/exchange">
          Open Exchange Board
        </Link>
        <Link className="btn secondary" href="/submit">
          Submit a Listing
        </Link>
      </div>
    </main>
  );
}
