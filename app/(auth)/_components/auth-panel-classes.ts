/**
 * The quote block on the auth pages' tile wall (see auth-shell.tsx). Kept in
 * a plain module so lib/auth-panel-contrast.test.ts can check these exact
 * classes against the tokens in app/globals.css, in both themes.
 *
 * The block is an opaque card over the wall, so the text only ever sits on
 * `card`, never on the painted tiles.
 */
export const AUTH_PANEL_SURFACE = "bg-card";
export const AUTH_PANEL_QUOTE_TEXT = "text-foreground";
export const AUTH_PANEL_ATTRIBUTION_TEXT = "text-muted-foreground";
