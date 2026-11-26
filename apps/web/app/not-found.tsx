import Link from "next/link";

export default function NotFound() {
  return (
    <section className="panel empty">
      <h1>Page not found</h1>
      <p className="muted">This flow or run may have been removed, or the URL may be incorrect.</p>
      <Link href="/flows" className="button">All flows</Link>
    </section>
  );
}
