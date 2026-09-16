"use client";

/**
 * Last-resort boundary: this replaces the root layout, so it cannot rely on
 * globals.css, fonts or any shared component being available. Everything here
 * is inline and self-contained on purpose.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          backgroundColor: "#fffcf8",
          color: "#1a1816",
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
      >
        <main
          style={{
            maxWidth: "32rem",
            width: "100%",
            textAlign: "center",
            border: "1px solid #ede8e0",
            borderRadius: "12px",
            backgroundColor: "#f7f3ed",
            padding: "48px 24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#c75d3a",
            }}
          >
            Kookboek
          </p>

          <h1
            style={{
              margin: "16px 0 0",
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: "28px",
              lineHeight: 1.2,
              fontWeight: 600,
            }}
          >
            Something boiled over
          </h1>

          <p
            style={{
              margin: "12px auto 0",
              maxWidth: "28rem",
              fontSize: "16px",
              lineHeight: 1.6,
              color: "#7a7268",
            }}
          >
            The app ran into an unexpected problem and could not recover on its
            own. Reloading usually fixes it.
          </p>

          {error.digest && (
            <p
              style={{
                margin: "16px 0 0",
                fontSize: "12px",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                color: "#a69e91",
              }}
            >
              Reference: {error.digest}
            </p>
          )}

          <div
            style={{
              marginTop: "32px",
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                cursor: "pointer",
                border: "none",
                borderRadius: "8px",
                backgroundColor: "#c75d3a",
                color: "#fffcf8",
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: 600,
                fontFamily: "inherit",
              }}
            >
              Try again
            </button>
            {/* A hard navigation on purpose: the app shell itself failed, so
                client-side routing is not something to lean on here. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                display: "inline-block",
                borderRadius: "8px",
                border: "1.5px solid #ede8e0",
                color: "#4a4640",
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Back to home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
