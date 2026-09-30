"use client";

/**
 * Last-resort boundary: this replaces the root layout, so it cannot rely on
 * globals.css, fonts, next-themes or any shared component being available.
 * Everything here is inline and self-contained on purpose.
 *
 * Without the theme class it follows the OS setting instead. The colours are
 * the Delft tokens from app/globals.css (checked there by
 * lib/color-contrast.test.ts):
 *   light: ink #141b2d on the white card (17.15:1); slate #4f5b75 text 6.81:1;
 *          delft #1d3c8c eyebrow 10.11:1; white on oranje #c24e12 4.78:1.
 *   dark:  #e7ecf6 on night-card #152040 (13.51:1); mist #a5b2ce 7.51:1;
 *          delft-light #8fb1f2 7.42:1; night on oranje-bright #ff8a45 7.82:1.
 */
const styles = `
  :root { color-scheme: light dark; }
  .ge-body {
    --ge-page: #f4f6fa;
    --ge-card: #ffffff;
    --ge-border: #d4dcec;
    --ge-text: #141b2d;
    --ge-muted: #4f5b75;
    --ge-brand: #1d3c8c;
    --ge-accent: #c24e12;
    --ge-accent-hover: #a3410e;
    --ge-on-accent: #ffffff;
    --ge-link: #141b2d;
    --ge-link-border: #d4dcec;
    --ge-link-hover: #e3e9f5;
    --ge-ring: #1d3c8c;
    --ge-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    box-sizing: border-box;
    background-color: var(--ge-page);
    color: var(--ge-text);
    font-family: 'Hanken Grotesk', system-ui, sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    .ge-body {
      --ge-page: #0d1428;
      --ge-card: #152040;
      --ge-border: #2a3a66;
      --ge-text: #e7ecf6;
      --ge-muted: #a5b2ce;
      --ge-brand: #8fb1f2;
      --ge-accent: #ff8a45;
      --ge-accent-hover: #ffa56f;
      --ge-on-accent: #0d1428;
      --ge-link: #e7ecf6;
      --ge-link-border: #6f80a8;
      --ge-link-hover: #1e2b52;
      --ge-ring: #8fb1f2;
      --ge-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
  }
  .ge-card {
    max-width: 32rem;
    width: 100%;
    box-sizing: border-box;
    text-align: center;
    border: 1px solid var(--ge-border);
    border-radius: 10px;
    background-color: var(--ge-card);
    padding: 48px 24px;
    box-shadow: var(--ge-shadow);
  }
  .ge-eyebrow {
    margin: 0;
    font-family: 'Gloock', Georgia, serif;
    font-size: 22px;
    line-height: 1;
    color: var(--ge-brand);
  }
  .ge-title {
    margin: 20px 0 0;
    font-family: 'Gloock', Georgia, serif;
    font-size: 36px;
    line-height: 1.1;
    letter-spacing: -0.01em;
    font-weight: 400;
  }
  .ge-text {
    margin: 12px auto 0;
    max-width: 28rem;
    font-size: 16px;
    line-height: 1.6;
    color: var(--ge-muted);
  }
  .ge-digest {
    margin: 16px 0 0;
    font-size: 12px;
    font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    font-variant-numeric: tabular-nums;
    color: var(--ge-muted);
  }
  .ge-actions {
    margin-top: 32px;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    justify-content: center;
  }
  .ge-button, .ge-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-height: 44px;
    border-radius: 6px;
    padding: 0 24px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    letter-spacing: 0.02em;
    text-decoration: none;
    cursor: pointer;
    transition: background-color 150ms ease, border-color 150ms ease;
  }
  .ge-button {
    border: none;
    background-color: var(--ge-accent);
    color: var(--ge-on-accent);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .ge-button:hover { background-color: var(--ge-accent-hover); }
  .ge-link {
    border: 1.5px solid var(--ge-link-border);
    color: var(--ge-link);
  }
  .ge-link:hover { background-color: var(--ge-link-hover); border-color: var(--ge-brand); }
  .ge-button:focus-visible, .ge-link:focus-visible {
    outline: 2px solid var(--ge-ring);
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    .ge-button, .ge-link { transition: none; }
  }
`;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <head>
        <title>Something went wrong | Kookboek</title>
        <meta name="color-scheme" content="light dark" />
        <style>{styles}</style>
      </head>
      <body className="ge-body">
        <main className="ge-card">
          <p className="ge-eyebrow">kookboek</p>

          <h1 className="ge-title">Something boiled over</h1>

          <p className="ge-text">
            The app ran into an unexpected problem and could not recover on its
            own. Reloading usually fixes it.
          </p>

          {error.digest && <p className="ge-digest">Reference: {error.digest}</p>}

          <div className="ge-actions">
            <button type="button" onClick={reset} className="ge-button">
              Try again
            </button>
            {/* A hard navigation on purpose: the app shell itself failed, so
                client-side routing is not something to lean on here. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="ge-link">
              Back to home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
