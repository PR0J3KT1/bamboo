"use client";

/* The last resort, when even the layout failed: plain HTML, no fonts or styles to rely on. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "#14291C", color: "#EEE7D2", fontFamily: "system-ui, sans-serif", textAlign: "center", padding: 16 }}>
        <h1 style={{ fontSize: 40, margin: 0, textTransform: "uppercase" }}>Something went wrong</h1>
        <p style={{ maxWidth: 420, margin: 0 }}>The site didn&rsquo;t load. Try again, or call or WhatsApp the lounge.</p>
        <button type="button" onClick={reset} style={{ height: 48, padding: "0 24px", borderRadius: 999, border: 0, background: "#CDDF7B", color: "#16240F", fontWeight: 700, fontSize: 16 }}>Try again</button>
      </body>
    </html>
  );
}
