# Kookboek

## Design System & Style Guide: Delft

Kookboek is a personal cookbook for home cooks: the recipes you actually make, kept in one place and shared by link. The design borrows from the most Dutch of kitchen objects, the Delft tile: white glazed porcelain, cobalt paint, and a wall of tiles whose corner ornaments join into a second pattern where they meet.

Every recipe gets its own tile. That is the one memorable thing in this system; everything around it stays quiet.

---

## 00 — Design Philosophy

- **Porcelain, not paper.** Cool white grounds, crisp edges, no textures or grain.
- **Cobalt does the talking.** Delft blue carries the brand: links, icons, selected states, tiles.
- **One orange thing per page.** Dutch oranje is reserved for the main action (the default button). If a page has two orange buttons, one of them is wrong.
- **The tile is the signature.** Recipes without a photo show their tile wall instead of a placeholder. Don't add other decoration to compete with it.
- **Numbers line up.** Amounts, times and counts use the mono face with tabular figures.
- **Plain words.** Sentence case, active verbs, English UI. A button says what it does ("Save recipe"), and its toast repeats it ("Recipe saved").

---

## 01 — Color Palette

All values are defined in `app/globals.css` (`@theme inline`) and checked for WCAG AA in `lib/color-contrast.test.ts`.

### Delft (brand)

| Token | Hex | Use |
|---|---|---|
| `delft` | `#1D3C8C` | Links, icons, headings accents, tile paint. 10.11:1 on white |
| `delft-deep` | `#142B66` | Hover for delft |
| `delft-light` | `#8FB1F2` | Delft on dark surfaces. 7.42:1 on night-card |

### Porcelain (neutrals)

| Token | Hex | Use |
|---|---|---|
| `porcelain` | `#F4F6FA` | Page background |
| white | `#FFFFFF` | Cards, inputs, popovers ("glaze") |
| `glaze` | `#E3E9F5` | Quiet surfaces: pills, muted panels, tile ground edge |
| `glaze-line` | `#D4DCEC` | Decorative lines, card edges (not for form controls) |
| `pewter` | `#737F9C` | Form-control edges. 4.00:1 on white, 3.29:1 on glaze |
| `slate` | `#4F5B75` | Secondary text. 6.81:1 on white |
| `ink` | `#141B2D` | Body text. 17.15:1 on white |

### Oranje (main action only)

| Token | Hex | Use |
|---|---|---|
| `oranje` | `#C24E12` | Default button. White text 4.78:1 |
| `oranje-deep` | `#A3410E` | Hover |
| `oranje-bright` | `#FF8A45` | Default button at night. Night text 7.82:1 |

### Status

| Token | Day | Night | Use |
|---|---|---|---|
| success | `#2B6E4F` | `#6FD3A2` | Easy, confirmations |
| warning | `#8A5A00` | `#F2C14E` | Medium, "outdated" notices |
| danger | `#B3261E` | `#FF8A80` | Hard, destructive actions, errors |
| gold | `#D99A1C` | same | Rating stars (graphic only, never text) |

Status badges use the colour as text on a 10% tint of itself (15% at night).

### Semantic tokens

Components use the semantic names, never raw hex:

```
background  porcelain / night          foreground  ink / #E7ECF6
card        white / night-card         muted-foreground  slate / mist
primary     delft / delft-light        primary-foreground  white / night
cta         oranje / oranje-bright     cta-foreground  white / night
surface, secondary, muted, accent      glaze / night-muted
border      glaze-line / night-line    input  pewter / #6F80A8
destructive danger / danger-light      ring   delft / delft-light
```

`bg-primary` is Delft, not orange. Orange only comes from `bg-cta` (the default Button variant).

---

## 02 — Typography

| Role | Face | Notes |
|---|---|---|
| Display | **Gloock** (`font-display`) | Titles only: page h1, recipe titles, section headings. One weight (400); never bold it. |
| Interface | **Hanken Grotesk** (`font-sans`) | Everything you read and press. 400 body, 500 labels, 600 buttons. |
| Data | **IBM Plex Mono** (`font-mono` + `tabular`) | Amounts, times, servings, counts, step timers. |

`html` sets `font-synthesis-weight: none`: asking Gloock for `font-semibold` renders regular, not a smeared fake bold. Don't put `font-semibold` on display text; size carries hierarchy.

### Type scale

| Name | Size / line-height | Face |
|---|---|---|
| Hero | 56–72px / 1.02, tracking -0.02em | Gloock |
| H1 | 36–44px / 1.1, tracking -0.01em | Gloock |
| H2 | 28px / 1.2 | Gloock |
| H3 | 20–22px / 1.3 | Gloock |
| Body | 16px / 1.6 | Hanken |
| Small | 14px / 1.5 | Hanken |
| Label / eyebrow | 12–13px, 500, tracking 0.06em, uppercase | Hanken |
| Data | 13–15px, tabular | Plex Mono |

Eyebrows (small uppercase labels above a title) are allowed only when they say something true, e.g. a recipe's category above its title.

---

## 03 — Spacing & Layout

- 4px base; common steps 8, 12, 16, 24, 32, 48, 64.
- Page container: `max-w-6xl` (1152px), `px-4 sm:px-6 lg:px-8`. Reading pages (recipe, recipe editor) `max-w-4xl`; single-column settings pages (account, profile) `max-w-2xl`.
- Section rhythm: 48px between sections on desktop, 32px on mobile.
- Grids: recipe cards 1 / 2 / 3 columns (sm / lg), 24px gap.
- Radius: `--radius` 6px. Buttons and inputs `rounded-lg` (6px), cards `rounded-xl` (10px), pills `rounded-full`. Tiles have the square corners of the object they depict (2px at most).

---

## 04 — Components

### Button (`components/ui/button.tsx`)

| Variant | Look | When |
|---|---|---|
| `default` | Oranje, white text, uppercase, tracking 0.06em | The one main action on a page |
| `outline` | White with a 1.5px glaze-line edge, ink text; hover delft edge | Everything else a page offers |
| `secondary` | Glaze fill, delft text | Toggles, secondary actions inside cards |
| `ghost` | Slate text, glaze on hover | Toolbars, icon buttons |
| `destructive` | Danger fill | Confirm-delete buttons inside dialogs only |
| `link` | Delft text, underline on hover | Inline actions |

Sizes: sm 36px, default 44px, lg 52px; icon buttons 44px (touch target).

### Card (`components/ui/card.tsx`)

White on the porcelain page, 1px `border` edge, `rounded-xl`, `shadow-soft`. Recipe cards lift 4px to `shadow-lifted` on hover.

### Recipe card

- Cover: the photo, or the recipe's **tile wall** (`DelftWall`, tile ~112px) when there's no photo.
- Time badge: glass pill, top-right, Plex Mono.
- Title: Gloock 20–22px, one line.
- Meta row: servings and rating in Plex Mono; difficulty as a status badge. Time lives only on the cover badge.
- Author: slate, linked to `/u/{handle}` when set.

### Inputs

48px, white, 1.5px `input` (pewter) edge, `rounded-md`, 16px text. Focus: delft border and a 3px `primary/15` halo. Error: danger border and halo, message below in danger 13px, linked with `aria-describedby`.

### Tag pills

`rounded-full`, glaze background, delft text, 12–13px, 500. At night: night-muted with delft-light text.

### Navigation

Sticky header on porcelain with a glaze-line bottom edge (glass while scrolling). Left: the tile mark + "kookboek" wordmark in Gloock. Active link: delft text with a 2px delft underline offset 6px.

### Empty states

A single `DelftTile` (96–120px) with the motif that fits (e.g. a cup for an empty shopping list), a Gloock title that says what's missing, one line of guidance, one action.

---

## 05 — Motion & Interaction

- Durations: fast 150ms (hover/color), normal 250ms (popovers), slow 400ms (cards lift).
- Easing: `ease-out` (`cubic-bezier(0.33, 1, 0.68, 1)`) for entering, `ease-in-out` for toggles.
- One orchestrated moment: the home page tile wall settles in (tiles fade and rise with a short stagger). Elsewhere, motion is limited to hover lift, focus, and dialog open/close.
- `prefers-reduced-motion`: all animation and transitions collapse to instant (see `globals.css`).

---

## 06 — The Delft Tile (signature)

`lib/delft-tile.ts` (pure, tested) and `components/delft/delft-tile.tsx` (SVG).

- **Seed:** the recipe's share code (`recipe.code`). Same recipe, same tile, forever.
- **Motif** from the recipe's tags, most specific first: seafood → fish, soups & stews → bowl, desserts → tulip, baking/bread/pasta → wheat, breakfast → sun, drinks → cup, poultry → hen, meat → pot, vegan/vegetarian/salads → sprig, dinner → windmill. Untagged recipes get a seeded fallback (rosette, tulip, windmill, sprig).
- **Seeded variation:** corner style (ox-head, spider, fleur, quarter), a slight tilt, optional painted ring, wash strength, line weight.
- **Colours:** `--tile-ground`, `--tile-ground-edge`, `--tile-paint`, `--tile-line`. Day: cobalt on porcelain. Night: pale blue on cobalt.

| Component | Use |
|---|---|
| `<DelftTile seed tags />` | A single tile: logo mark, empty states, tag headers, small marks |
| `<DelftWall seed tags tileSize />` | The tile repeated as a wall: covers without a photo (cards, recipe hero, collections) |

Tiles are decorative (`aria-hidden`) unless given a `label`. Don't recolour them, add borders around them, or put text on top of a wall except the glass time badge.

---

## 07 — Dark Mode

Delft at night: the same structure, inverted grounds.

| Token | Value |
|---|---|
| background (night) | `#0D1428` |
| card (night-card) | `#152040` |
| muted (night-muted) | `#1E2B52` |
| border (night-line) | `#2A3A66` |
| foreground | `#E7ECF6` (13.51:1 on card) |
| muted-foreground (mist) | `#A5B2CE` (7.51:1 on card) |
| primary | `#8FB1F2` |
| cta | `#FF8A45` with night text |

Theme follows the system by default; the header toggle offers light / dark / system (`next-themes`, class strategy).

---

## 08 — Iconography

Lucide, 1.5–2px stroke, `size-4` in buttons, `size-5` in navigation. Icons are delft when they carry meaning (nav, section headings), slate when supportive. Recipe imagery is never an icon: use the tile.

---

## 09 — Accessibility

- Text 4.5:1, large text and UI boundaries 3:1, in both themes (tests in `lib/color-contrast.test.ts`, `lib/auth-panel-contrast.test.ts`).
- Visible focus: 2px delft ring with 2px offset on buttons/links; delft border + halo on inputs.
- Touch targets ≥ 44px.
- Form errors in `role="alert"`, fields linked with `aria-invalid` / `aria-describedby`.
- Reduced motion respected globally.

---

## 10 — Implementation

- Tokens: `app/globals.css`. Fonts: `app/layout.tsx` via `next/font` (`--font-gloock`, `--font-hanken`, `--font-plex-mono`).
- Primitives: `components/ui/*` (shadcn, restyled). Use variants, not one-off colour classes.
- Use semantic utilities (`bg-card`, `text-muted-foreground`, `text-primary`, `bg-cta`) or the named palette (`bg-glaze`, `text-delft`, `text-success`). Never raw hex in components.
