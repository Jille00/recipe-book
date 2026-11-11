# Kookboek

## Design System & Style Guide: Oogst

Kookboek is a personal cookbook for home cooks: the recipes you actually make, kept in one place and shared by link. The design is called Oogst, Dutch for harvest. Every recipe takes the colour of what's in it, and that colour follows the recipe everywhere: its label, its page, cook mode and the dots on the shopping list.

Every recipe has a colour. That is the one memorable thing in this system; everything around it stays quiet.

Design source: the Figma file "Kookboek — Redesign", page "Oogst redesign".

---

## 00 — Design Philosophy

- **Colour is the recipe's.** The nine recipe colours belong to recipes and categories. The interface itself is aubergine on leek and never borrows them for decoration.
- **Flat.** Colour separates surfaces, not shadow or borders. Only things that float (menus, dialogs, a card under the pointer) cast a shadow.
- **One filled pill per page.** The main action is the filled aubergine button. Everything else a page offers is an outline.
- **The label is the signature.** A recipe without a photo is never a grey placeholder: it is a block of its own colour with its name set large. Don't add other decoration to compete with it.
- **Names set large.** Titles use the condensed display face, tight and big. Size carries hierarchy; there are no small uppercase labels.
- **Numbers line up.** Amounts, times and counts use tabular figures in bold.
- **Plain words.** Sentence case, active verbs, English UI. A button says what it does ("Save recipe"), and its toast repeats it ("Recipe saved").

---

## 01 — Color Palette

All values are defined in `app/globals.css` and checked for WCAG AA in `lib/color-contrast.test.ts` and `lib/recipe-colour.test.ts`.

### Interface

| Token | Hex | Use |
|---|---|---|
| `ink` (aubergine) | `#2D1B33` | Text, main buttons, field edges. 16.0:1 on white |
| `fig` | `#6A5A70` | Secondary text. 5.69:1 on leek, 5.21:1 on leek-soft |
| `leek` | `#F1F4E8` | Page background |
| white | `#FFFFFF` | Panels, fields, popovers |
| `leek-soft` | `#E6EBD9` | Quiet fills: pill tracks, hover, muted panels |
| `leek-line` | `#D8DEC8` | Dividers, chip edges |

### Recipe colours

Each colour is a pair: the block, and the text that reads on it (at least 4.5:1).

| Name | Block | Text on it | Ratio | Used for |
|---|---|---|---|---|
| tomato | `#C9331C` | `#FFF4DC` | 4.84 | Pasta, sauces, meat, poultry |
| carrot | `#F08A24` | `#2D1B33` | 6.36 | Soups, stews |
| lemon | `#F4C92F` | `#2D1B33` | 10.06 | Breakfast, eggs, drinks |
| basil | `#25703F` | `#F8E9B4` | 4.99 | Vegetables, salads, vegan |
| sea | `#27699E` | `#F3F0DA` | 5.08 | Fish, seafood |
| plum | `#4E2B63` | `#F4D9A8` | 8.29 | Dinner, and the default |
| beet | `#AE2159` | `#FFE9D6` | 5.66 | Desserts, fruit |
| rye | `#C99A5B` | `#2D1B33` | 6.27 | Bread, grains |
| butter | `#F8E9B4` | `#2D1B33` | 13.15 | Baking |

At night plum is lifted to `#6B3D86` so it doesn't sink into the page.

### Status

| Token | Day | Night | Use |
|---|---|---|---|
| success | `#2B6E4F` | `#6FD3A2` | Confirmations |
| warning | `#8A5A00` | `#F2C14E` | "Outdated" notices |
| danger | `#B3261E` | `#FF8A80` | Destructive actions, errors |
| gold | `#F08A24` | same | Rating stars (graphic only, never text) |

Status badges use the colour as text on a 10% tint of itself (15% at night).

### Semantic tokens

Components use the semantic names, never raw hex:

```
background  leek / night               foreground  ink / #F3EEE0
card        white / night-card         muted-foreground  fig / #C4B5C9
primary     ink / butter               primary-foreground  white / night
cta         ink / butter               cta-foreground  white / night
surface, secondary, muted, accent      leek-soft / #36223F
border      leek-line / #4A3554        input  ink / #A794AD
destructive danger / danger-light      ring   ink / butter
recipe      the recipe colour in scope on-recipe  the text that reads on it
```

---

## 02 — Typography

One superfamily at two widths.

| Role | Face | Notes |
|---|---|---|
| Display | **Sofia Sans Extra Condensed** (`font-display`) | Titles: page h1, recipe names, section headings, big numbers. Always ExtraBold (800). |
| Interface | **Sofia Sans** (`font-sans`) | Everything you read and press. 400 body, 600 labels, 700 buttons and amounts. |

There is no mono face. `font-mono` maps to Sofia Sans, and `tabular` (or `font-mono`) turns on tabular figures.

`html` sets `font-synthesis-weight: none`, so a missing weight renders as the real one rather than a smeared fake bold.

### Type scale

| Name | Size / line-height | Face |
|---|---|---|
| Hero | 92–160px / 0.84 | Display |
| H1 | 60–96px / 0.88 | Display |
| H2 | 44–60px / 0.95 | Display |
| H3 | 30–36px / 0.95 | Display |
| Label title | 44–48px / 0.9, up to three lines, balanced | Display |
| Lead | 20px / 1.5 | Sofia Sans |
| Body | 16–17px / 1.5 | Sofia Sans |
| Small | 14–15px / 1.5 | Sofia Sans |
| Label | 14–15px, 600–700, sentence case | Sofia Sans |

No uppercase labels and no letter-spacing on small text. A line above a title is allowed only when it says something true, e.g. a recipe's category, and it is set as a bold underlined link.

---

## 03 — Spacing & Layout

- 4px base; common steps 8, 12, 16, 24, 32, 48, 64, 88.
- Page container: `max-w-6xl` (1152px), `px-4 sm:px-6 lg:px-8`. The recipe page and the home hero use the full container; single-column settings pages (account, profile) `max-w-2xl`.
- Section rhythm: 64–88px between sections on desktop, 48px on mobile.
- Grids: recipe labels 1 / 2 / 3 columns (sm / lg), four across on the home page; 24px gap.
- Radius: `--radius` 12px. Buttons, chips and segmented controls are full pills; fields `rounded-xl` (16px); labels 20px; panels `rounded-3xl` (24px).

---

## 04 — Components

### Button (`components/ui/button.tsx`)

| Variant | Look | When |
|---|---|---|
| `default` | Aubergine pill, white text | The one main action on a page |
| `outline` | 2px aubergine outline; fills on hover | Everything else a page offers |
| `secondary` | Leek-soft fill | Toggles, secondary actions inside panels |
| `ghost` | Text only, leek-soft on hover | Toolbars, icon buttons |
| `destructive` | Danger fill | Confirm-delete buttons inside dialogs only |
| `link` | Bold, 2px underline | Inline actions |
| `on-recipe`, `on-recipe-outline` | The recipe pair, inverted or outlined | A button on a colour block outside a `recipe-surface` |

Sizes: sm 40px, default 48px, lg 56px; icon buttons 48px.

### Panel (`components/ui/card.tsx`)

White on the leek page, `rounded-3xl`, no border and no shadow.

### Recipe label (`components/recipe/recipe-card.tsx`)

- The whole card is a block of the recipe's colour, 20px radius, at least 336px tall.
- Category top left, time pill top right (the pair inverted), nothing else up there.
- Title bottom left in the display face, up to three balanced lines.
- Meta row under the title: "Serves 4", rating, difficulty, author. A favorite pill sits bottom right.
- With a photo: the photo fills the top at 4:3 and the colour stays as the band that carries the name.
- On hover the label lifts 4px and casts `shadow-lifted`.

### Fields

52px, white, 1.5px ink edge, `rounded-xl`, 17px text. Focus: a 3px ink halo. Error: danger border and halo, message below in danger 13px, linked with `aria-describedby`.

### Chips

40px pills: white, 1.5px leek-line edge, 15px semibold, led by a dot of the category's colour. The selected chip is an aubergine pill. Categories on the home page and `/tags` are large pills filled with their own colour (`CategoryPills`).

### Checkbox, radio, switch

20px, drawn in a 2px ink edge on white like fields; checked is filled aubergine. A switch that is off is an outlined track with an ink thumb, and on it is the filled pill, so the two states never look alike.

### Menus, popovers, dialogs, toasts

Anything that floats is white, has no edge, and casts `shadow-lifted`. Menus and popovers have a 16px radius with 12px-radius rows at 15px; dialogs and sheets are panels (`rounded-3xl`) over an aubergine scrim; tooltips are small aubergine blocks. They render outside the page, so inside a recipe-coloured surface they stay white.

### Pagination

Ghost pills; the current page is the filled aubergine pill.

### Segmented control

A leek-soft track with the active segment as an aubergine pill (`Tabs`, the shopping list's view switch, the theme switch).

### Navigation

Sticky header on the leek page (glass while scrolling). Left: three cookbook spines in tomato, lemon and basil, and the "kookboek" wordmark in the display face. The active link is an aubergine pill. The footer is an aubergine band by day and card-coloured at night.

### Collections

A collection's cover is a row of stripes, one per recipe in it, in those recipes' colours (`ColourStripes`).

### Empty states

One blank label (`ColourSwatch`) in the colour that fits, a display title that says what's missing, one line of guidance, one action.

---

## 05 — Motion & Interaction

- Durations: fast 150ms (hover/color), normal 250ms (popovers), slow 400ms (labels lift).
- Easing: `ease-out` (`cubic-bezier(0.33, 1, 0.68, 1)`) for entering, `ease-in-out` for toggles.
- One orchestrated moment: the home page's wall of colour settles in, block after block. Elsewhere, motion is limited to hover lift, focus, and dialog open/close.
- `prefers-reduced-motion`: all animation and transitions collapse to instant (see `globals.css`).

---

## 06 — Recipe Colour (signature)

`lib/recipe-colour.ts` (pure, tested), `components/recipe/recipe-colour.tsx`, and the `.recipe-*` classes in `app/globals.css`.

- **From the tags**, most specific first: seafood → sea, soups & stews → carrot, desserts → beet, bread → rye, baking → butter, breakfast and drinks → lemon, vegan/vegetarian/salads → basil, pasta/meat/poultry → tomato, dinner → plum.
- **Otherwise from the seed:** the recipe's share code (`recipe.code`) picks one of the nine. Same recipe, same colour, forever.
- **In scope:** a `.recipe-<name>` class sets `--recipe` and `--on-recipe` for everything inside it. Use `bg-recipe text-on-recipe`, or the reverse for a pill on the block.
- **A whole surface:** add `recipe-surface` next to the `.recipe-*` class and the semantic tokens are remapped to the pair, so buttons, borders and text inside follow without per-component styling. The recipe page's hero and cook mode work this way.

| Component | Use |
|---|---|
| `<ColourBlock seed tags />` | A block that fills its box: the cover stand-in behind the photo upload |
| `<ColourSwatch seed tags />` | A small square: list rows, empty states, category headers |
| `<ColourDot seed tags />` | A 12px dot: chips, and which recipe a shopping-list line is for |
| `<ColourStripes colours />` | A collection's cover |

Rules:

- Never use a recipe colour as text on the page: several are too light. Put the text on a block of the colour instead (the method's step numbers are done this way).
- Don't recolour the pairs, add borders around blocks, or put anything on a label besides category, time, title and meta.
- Blocks that only stand in for a photo are decoration (`aria-hidden`) and don't print.

---

## 07 — Dark Mode

Aubergine at night: the same structure, with butter taking aubergine's place for actions.

| Token | Value |
|---|---|
| background (night) | `#1B1020` |
| card | `#281830` |
| muted | `#36223F` |
| border | `#4A3554` |
| foreground | `#F3EEE0` (14.34:1 on card) |
| muted-foreground | `#C4B5C9` (8.55:1 on card) |
| primary, cta | `#F8E9B4` with night text (15.16:1) |

The recipe colours are the same at night, except plum (see 01). Theme follows the system by default; the header toggle offers light / dark / system (`next-themes`, class strategy).

---

## 08 — Iconography

Lucide, 2px stroke, 18px in buttons, 20px in navigation. Icons take the colour of the text beside them. Recipe imagery is never an icon: use the colour.

---

## 09 — Accessibility

- Text 4.5:1, large text and UI boundaries 3:1, in both themes and on all nine recipe colours (tests in `lib/color-contrast.test.ts`, `lib/recipe-colour.test.ts`, `lib/auth-panel-contrast.test.ts`).
- Visible focus: 2px ring in the foreground colour with 2px offset on buttons and links; border and halo on fields. Inside a `recipe-surface` the ring takes the on-recipe colour.
- Touch targets ≥ 44px. Chips and `sm` buttons are 40px (section 04): use them only in rows with at least 8px between targets, never as the only way to an action on a phone.
- Form errors in `role="alert"`, fields linked with `aria-invalid` / `aria-describedby`.
- Reduced motion respected globally.
- Colour is never the only carrier: a label always names its category, and shopping-list dots repeat what the "By recipe" view says in words.

---

## 10 — Email

`lib/email.ts` has one layout for every transactional email: the spines and wordmark on a leek page, then a white 24px-radius panel with a display heading, the message at 17px, one aubergine pill, a plain-link fallback and a footnote in fig. Night colours are applied where the mail client honours `prefers-color-scheme`. Sofia Sans loads where web fonts are supported; elsewhere the heading falls back to a condensed bold and the text to Helvetica. Email cannot read the CSS tokens, so the hex values are repeated in that file: change both together.

---

## 11 — Implementation

- Tokens and recipe colours: `app/globals.css`. Fonts: `app/layout.tsx` via `next/font` (`--font-sofia`, `--font-sofia-condensed`).
- Primitives: `components/ui/*` (shadcn, restyled). Use variants, not one-off colour classes.
- Use semantic utilities (`bg-card`, `text-muted-foreground`, `text-primary`, `bg-cta`), the recipe pair (`bg-recipe`, `text-on-recipe`) or the named palette (`bg-leek`, `text-fig`, `text-success`). Never raw hex in components.
- Times on labels go through `formatMinutes` (`lib/utils/format-time.ts`): "40 min", "2 h", "1 h 15".
