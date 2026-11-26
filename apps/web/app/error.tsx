"use client";

export default function RouteError({ retry }: { retry: () => void }) {
  return (
    <section className="panel empty">
      <h1>Could not load this page</h1>
      <p className="muted" role="alert">Check that the Flowlet API is running, then try again.</p>
      <button className="button" onClick={retry}>Try again</button>
    </section>
  );
}
