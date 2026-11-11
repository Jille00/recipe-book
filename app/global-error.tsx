"use client";

/**
 * Last-resort boundary: this replaces the root layout, so it cannot rely on
 * globals.css, fonts, next-themes or any shared component being available.
 * Everything here is inline and self-contained on purpose.
 *
 * Without the theme class it follows the OS setting instead. The colours are
 * the Oogst tokens from app/globals.css:
 *   light: aubergine #2d1b33 on the white card (16.0:1); fig #6a5a70 text
 *          6.24:1; white on the aubergine button 16.0:1.
 *   dark:  #f3eee0 on the night card #281830 (14.34:1); #c4b5c9 text 8.55:1;
 *          night #1b1020 on the butter button #f8e9b4 15.16:1.
 */
const styles = `
  :root { color-scheme: light dark; }
  .ge-body {
    --ge-page: #f1f4e8;
    --ge-card: #ffffff;
    --ge-border: #d8dec8;
    --ge-text: #2d1b33;
    --ge-muted: #6a5a70;
    --ge-brand: #2d1b33;
    --ge-accent: #2d1b33;
    --ge-accent-hover: #4e2b63;
    --ge-on-accent: #ffffff;
    --ge-link: #2d1b33;
    --ge-link-border: #2d1b33;
    --ge-link-hover: #e6ebd9;
    --ge-ring: #2d1b33;
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    box-sizing: border-box;
    background-color: var(--ge-page);
    color: var(--ge-text);
    font-family: 'Sofia Sans', system-ui, sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    .ge-body {
      --ge-page: #1b1020;
      --ge-card: #281830;
      --ge-border: #4a3554;
      --ge-text: #f3eee0;
      --ge-muted: #c4b5c9;
      --ge-brand: #f8e9b4;
      --ge-accent: #f8e9b4;
      --ge-accent-hover: #fff6d6;
      --ge-on-accent: #1b1020;
      --ge-link: #f3eee0;
      --ge-link-border: #f3eee0;
      --ge-link-hover: #36223f;
      --ge-ring: #f8e9b4;
    }
  }
  .ge-card {
    max-width: 32rem;
    width: 100%;
    box-sizing: border-box;
    text-align: center;
    border-radius: 24px;
    background-color: var(--ge-card);
    padding: 48px 24px;
  }
  .ge-eyebrow {
    margin: 0;
    font-family: 'Sofia Sans Extra Condensed', 'Arial Narrow', sans-serif;
    font-weight: 800;
    font-size: 30px;
    line-height: 1;
    color: var(--ge-brand);
  }
  .ge-title {
    margin: 20px 0 0;
    font-family: 'Sofia Sans Extra Condensed', 'Arial Narrow', sans-serif;
    font-size: 52px;
    line-height: 0.92;
    font-weight: 800;
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
    min-height: 48px;
    border-radius: 999px;
    padding: 0 24px;
    font-size: 16px;
    font-weight: 700;
    font-family: inherit;
    text-decoration: none;
    cursor: pointer;
    transition: background-color 150ms ease, border-color 150ms ease;
  }
  .ge-button {
    border: none;
    background-color: var(--ge-accent);
    color: var(--ge-on-accent);
  }
  .ge-button:hover { background-color: var(--ge-accent-hover); }
  .ge-link {
    border: 2px solid var(--ge-link-border);
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
