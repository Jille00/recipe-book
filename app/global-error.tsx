"use client";

/**
 * Last-resort boundary: this replaces the root layout, so it cannot rely on
 * globals.css, fonts, next-themes or any shared component being available.
 * Everything here is inline and self-contained on purpose.
 *
 * Without the theme class it follows the OS setting instead. The colours are
 * the light and dark tokens from app/globals.css (checked there by
 * lib/color-contrast.test.ts):
 *   light: ink on cream; stone-dark (#6b645b) text is 5.28:1 on parchment;
 *          cream on terracotta-600 is 5.58:1.
 *   dark:  #f5f2ed on #1a1816; taupe text is 5.98:1 on the #242220 card;
 *          ink on terracotta-400 is 6.13:1, which is 5.48:1 as text.
 */
const styles = `
  :root { color-scheme: light dark; }
  .ge-body {
    --ge-page: #fffcf8;
    --ge-card: #f7f3ed;
    --ge-border: #ede8e0;
    --ge-text: #1a1816;
    --ge-muted: #6b645b;
    --ge-accent: #a84a2d;
    --ge-accent-hover: #8a3b23;
    --ge-on-accent: #fffcf8;
    --ge-link: #4a4640;
    --ge-link-border: #ede8e0;
    --ge-link-hover: #f7f3ed;
    --ge-ring: #c75d3a;
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
    font-family: 'DM Sans', system-ui, sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    .ge-body {
      --ge-page: #1a1816;
      --ge-card: #242220;
      --ge-border: #3d3935;
      --ge-text: #f5f2ed;
      --ge-muted: #a69e91;
      --ge-accent: #e8785a;
      --ge-accent-hover: #f4a98a;
      --ge-on-accent: #1a1816;
      --ge-link: #f5f2ed;
      --ge-link-border: #8a8276;
      --ge-link-hover: #2d2a26;
      --ge-ring: #e8785a;
      --ge-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
  }
  .ge-card {
    max-width: 32rem;
    width: 100%;
    box-sizing: border-box;
    text-align: center;
    border: 1px solid var(--ge-border);
    border-radius: 12px;
    background-color: var(--ge-card);
    padding: 48px 24px;
    box-shadow: var(--ge-shadow);
  }
  .ge-eyebrow {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ge-accent);
  }
  .ge-title {
    margin: 16px 0 0;
    font-family: 'Fraunces', Georgia, serif;
    font-size: 28px;
    line-height: 1.2;
    font-weight: 600;
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
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
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
    display: inline-block;
    border-radius: 8px;
    padding: 12px 24px;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    line-height: 1.5;
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
    border: 1.5px solid var(--ge-link-border);
    color: var(--ge-link);
  }
  .ge-link:hover { background-color: var(--ge-link-hover); }
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
          <p className="ge-eyebrow">Kookboek</p>

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
