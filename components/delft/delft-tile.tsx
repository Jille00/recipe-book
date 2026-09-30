import { useId } from "react";
import { cn } from "@/lib/utils";
import { tileSpec, type TileCorner, type TileMotif, type TileSpec } from "@/lib/delft-tile";

/*
 * Painted Delft tiles (STYLE_GUIDE 06). Colours come from the --tile-* tokens
 * in globals.css, so tiles follow the theme: blue on porcelain by day,
 * pale blue on cobalt at night. All drawing happens in a 100×100 box.
 */

const PAINT = "var(--tile-paint)";

function Corner({ style, stroke, wash }: { style: TileCorner; stroke: number; wash: number }) {
  const thin = stroke * 0.7;
  switch (style) {
    case "ox-head":
      return (
        <g>
          <path d="M0 7 A7 7 0 0 0 7 0 Z" fill={PAINT} fillOpacity={wash * 2.2} />
          <path d="M0 13 A13 13 0 0 0 13 0" fill="none" stroke={PAINT} strokeWidth={thin} />
          <path d="M9.5 9.5 L12.5 12.5" stroke={PAINT} strokeWidth={thin} strokeLinecap="round" />
        </g>
      );
    case "spider":
      return (
        <g stroke={PAINT} strokeWidth={thin} strokeLinecap="round" fill="none">
          <path d="M2 2 L12 12" />
          <path d="M12 12 L9 15 M12 12 L15 9" />
          <path d="M6.5 6.5 L4 10 M6.5 6.5 L10 4" />
        </g>
      );
    case "fleur":
      return (
        <g>
          <path
            d="M0 0 C 7 2, 11 6, 12.5 12.5 C 6 11, 2 7, 0 0 Z"
            fill={PAINT}
            fillOpacity={wash * 2}
            stroke={PAINT}
            strokeWidth={thin}
            strokeLinejoin="round"
          />
          <path d="M3 0 Q 10 3 14 1.5 M0 3 Q 3 10 1.5 14" fill="none" stroke={PAINT} strokeWidth={thin} strokeLinecap="round" />
        </g>
      );
    case "quarter":
      return (
        <g>
          <path d="M0 9 L9 0 L15 0 L0 15 Z" fill={PAINT} fillOpacity={wash * 1.8} />
          <path d="M0 9 L9 0 M0 15 L15 0" stroke={PAINT} strokeWidth={thin} strokeLinecap="round" />
        </g>
      );
  }
}

function Motif({ spec }: { spec: TileSpec }) {
  const { motif, stroke, wash, spin } = spec;
  const line = { stroke: PAINT, strokeWidth: stroke, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  const shape = { ...line, fill: PAINT, fillOpacity: wash };
  const detail = { ...line, strokeWidth: stroke * 0.6 };

  const draw: Record<TileMotif, React.ReactNode> = {
    tulip: (
      <>
        <path {...line} d="M50 73 C 50 65, 50 58, 50 52" />
        <path {...shape} d="M50 70 C 43 66, 39 59, 38 52 C 44 55, 48 61, 50 66" />
        <path {...shape} d="M50 70 C 57 66, 61 59, 62 52 C 56 55, 52 61, 50 66" />
        <path {...shape} fillOpacity={wash * 1.8} d="M41 36 C 41 46, 45 52, 50 52 C 55 52, 59 46, 59 36 C 56 40, 53 41, 50 34 C 47 41, 44 40, 41 36 Z" />
        <path {...detail} d="M50 35 L50 49" />
      </>
    ),
    wheat: (
      <>
        <path {...line} d="M50 76 C 50 62, 50 44, 50 30" />
        {[0, 1, 2, 3].map((i) => {
          const y = 36 + i * 9;
          return (
            <g key={i}>
              <path {...shape} d={`M50 ${y + 6} C 44 ${y + 5}, 42 ${y}, 43 ${y - 3} C 48 ${y - 1}, 50 ${y + 2}, 50 ${y + 6} Z`} />
              <path {...shape} d={`M50 ${y + 6} C 56 ${y + 5}, 58 ${y}, 57 ${y - 3} C 52 ${y - 1}, 50 ${y + 2}, 50 ${y + 6} Z`} />
              <path {...detail} d={`M43 ${y - 3} L40 ${y - 8} M57 ${y - 3} L60 ${y - 8}`} />
            </g>
          );
        })}
        <path {...shape} d="M50 33 C 47 29, 48 24, 50 21 C 52 24, 53 29, 50 33 Z" />
      </>
    ),
    fish: (
      <>
        <path {...shape} d="M27 50 C 35 38, 57 38, 65 50 C 57 62, 35 62, 27 50 Z" />
        <path {...shape} d="M65 50 L75 42 C 73 47, 73 53, 75 58 Z" />
        <path {...detail} d="M41 42 C 44 46, 44 54, 41 58" />
        <path {...detail} d="M48 45.5 q3 4.5 0 9 M54 44.5 q3 5.5 0 11 M60 46 q2.5 4 0 8" />
        <path {...detail} d="M46 40 C 49 35, 54 35, 56 40" />
        <circle cx={35} cy={48} r={1.7} fill={PAINT} />
      </>
    ),
    bowl: (
      <>
        <path {...shape} d="M30 50 H70 C 70 62, 61 68, 50 68 C 39 68, 30 62, 30 50 Z" />
        <path {...line} d="M27 50 H73" />
        <path {...line} d="M43 70.5 H57" />
        <path {...detail} d="M34 56 C 44 59.5, 56 59.5, 66 56" />
        <path {...detail} d="M42 45 C 39 41, 45 38, 42 33 M50 45 C 47 41, 53 38, 50 33 M58 45 C 55 41, 61 38, 58 33" />
      </>
    ),
    windmill: (
      <>
        <path {...shape} d="M44 72 L47 48 H53 L56 72 Z" />
        <path {...line} d="M46 48 L50 43 L54 48" />
        <path {...detail} d="M48.5 72 V67 A1.5 1.5 0 0 1 51.5 67 V72" />
        <path {...line} d="M31 72 H69" />
        <g transform={`rotate(${spin} 50 45)`}>
          {[0, 90, 180, 270].map((angle) => (
            <g key={angle} transform={`rotate(${angle} 50 45)`}>
              <path {...shape} d="M50 45 L50 25 L55.5 26 L54 43 Z" />
              <path {...detail} d="M52.6 28.5 L52.2 41" />
            </g>
          ))}
        </g>
        <circle cx={50} cy={45} r={1.6} fill={PAINT} />
      </>
    ),
    cup: (
      <>
        <path {...shape} d="M36 42 H60 V54 C 60 61, 55 66, 48 66 C 41 66, 36 61, 36 54 Z" />
        <path {...line} d="M60 46 C 67 46, 67 58, 60 58" />
        <ellipse cx={48} cy={68.5} rx={18} ry={3} {...line} />
        <path {...detail} d="M36 48.5 H60" />
        <path {...detail} d="M44 38 C 42 34, 46 32, 44 28 M52 38 C 50 34, 54 32, 52 28" />
      </>
    ),
    sprig: (
      <>
        <path {...line} d="M38 73 C 44 61, 50 48, 62 30" />
        {[
          [41, 64, -130],
          [46.5, 55, -130],
          [52, 46, -128],
          [57, 38, -125],
          [44.5, 62, 12],
          [50, 52.5, 8],
          [55.5, 43.5, 5],
        ].map(([x, y, angle]) => (
          <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={6} ry={2.6} transform={`rotate(${angle} ${x} ${y}) translate(5 0)`} {...shape} />
        ))}
        <circle cx={62} cy={30} r={2.1} {...shape} fillOpacity={wash * 2} />
      </>
    ),
    sun: (
      <>
        <circle cx={50} cy={50} r={10} {...shape} />
        <circle cx={50} cy={50} r={4} fill={PAINT} fillOpacity={wash * 2.4} />
        <g transform={`rotate(${spin} 50 50)`}>
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} {...(i % 2 ? detail : line)} d={i % 2 ? "M50 35.5 L50 32" : "M50 36 L50 28"} transform={`rotate(${i * 30} 50 50)`} />
          ))}
        </g>
      </>
    ),
    hen: (
      <>
        <path {...shape} d="M34 56 C 34 46, 44 42, 54 44 C 62 45, 66 52, 64 58 C 62 65, 54 68, 46 68 C 38 68, 34 62, 34 56 Z" />
        <path {...line} d="M58 46 C 58 39, 60 34, 63 32.5" />
        <circle cx={65} cy={34} r={4} {...shape} />
        <path {...detail} d="M61.5 30.5 q1.6 -3.2 3.2 0 q1.6 -3.2 3.2 0" />
        <path d="M68.8 33.2 L73 34.8 L68.8 36.4 Z" fill={PAINT} />
        <circle cx={66} cy={33.6} r={0.9} fill={PAINT} />
        <path {...detail} d="M34 54 C 28 48, 28 40, 32 35 M36.5 50 C 31.5 44, 32.5 38, 36.5 33.5 M39.5 48 C 36.5 42, 38 37, 41 34" />
        <path {...detail} d="M42 54 C 46 50, 54 50, 56 56 C 52 60, 46 60, 42 54 Z" />
        <path {...detail} d="M46 68 L45 74 M52 68 L53 74 M42.5 74 H47.5 M50.5 74 H55.5" />
      </>
    ),
    pot: (
      <>
        <path {...shape} d="M30 48 H70 V60 C 70 66, 66 69, 60 69 H40 C 34 69, 30 66, 30 60 Z" />
        <path {...shape} fillOpacity={wash * 1.6} d="M28 48 C 34 41, 66 41, 72 48 Z" />
        <path {...line} d="M46.5 42.5 V39 H53.5 V42.5" />
        <path {...line} d="M30 52 H24.5 M70 52 H75.5" />
        <path {...detail} d="M30 56.5 H70" />
        <path {...detail} d="M42 36 C 40 32, 44 30, 42 26 M58 36 C 56 32, 60 30, 58 26" />
      </>
    ),
    rosette: (
      <>
        <g transform={`rotate(${spin} 50 50)`}>
          {Array.from({ length: 8 }, (_, i) => (
            <ellipse key={i} cx={50} cy={37.5} rx={4.6} ry={10} transform={`rotate(${i * 45} 50 50)`} {...shape} />
          ))}
        </g>
        <circle cx={50} cy={50} r={5.2} fill={PAINT} fillOpacity={0.85} />
      </>
    ),
  };

  return <g transform={`rotate(${spec.tilt} 50 50)`}>{draw[motif]}</g>;
}

/** The painted tile itself, in a 100×100 coordinate space. */
export function TileArt({ spec }: { spec: TileSpec }) {
  const glazeId = `glaze-${useId().replace(/:/g, "")}`;
  return (
    <g>
      <defs>
        <radialGradient id={glazeId} cx="50%" cy="45%" r="70%">
          <stop offset="0%" stopColor="var(--tile-ground)" />
          <stop offset="100%" stopColor="var(--tile-ground-edge)" />
        </radialGradient>
      </defs>
      <rect width={100} height={100} fill={`url(#${glazeId})`} />
      <rect x={0.5} y={0.5} width={99} height={99} fill="none" stroke="var(--tile-line)" strokeWidth={1} />
      {[0, 90, 180, 270].map((angle) => (
        <g key={angle} transform={`rotate(${angle} 50 50)`}>
          <Corner style={spec.corner} stroke={spec.stroke} wash={spec.wash} />
        </g>
      ))}
      {spec.medallion && (
        <g>
          <circle cx={50} cy={50} r={30} fill={PAINT} fillOpacity={spec.wash * 0.35} />
          <circle cx={50} cy={50} r={30} fill="none" stroke={PAINT} strokeWidth={spec.stroke * 0.75} />
          <circle cx={50} cy={50} r={27} fill="none" stroke={PAINT} strokeWidth={spec.stroke * 0.35} />
        </g>
      )}
      <Motif spec={spec} />
    </g>
  );
}

interface DelftTileProps {
  /** Stable seed, normally the recipe's share code. */
  seed: string;
  /** Tag names or slugs; the first recognised one picks the motif. */
  tags?: readonly string[] | null;
  className?: string;
  /** Accessible name; tiles are decorative (hidden) without one. */
  label?: string;
}

/** One square tile, e.g. a logo mark or an empty-state illustration. */
export function DelftTile({ seed, tags, className, label }: DelftTileProps) {
  const spec = tileSpec(seed, tags);
  return (
    <svg
      data-delft="tile"
      viewBox="0 0 100 100"
      className={cn("block", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <TileArt spec={spec} />
    </svg>
  );
}

interface DelftWallProps extends DelftTileProps {
  /** Rendered size of one tile in CSS pixels. */
  tileSize?: number;
}

/**
 * A wall of the same tile, as real Delft tiles are laid: the corner ornaments
 * meet and form a second pattern where four tiles touch. Fills its box, so it
 * works as a cover for recipes without a photo.
 */
export function DelftWall({ seed, tags, className, label, tileSize = 120 }: DelftWallProps) {
  const spec = tileSpec(seed, tags);
  const patternId = `wall-${useId().replace(/:/g, "")}`;
  return (
    <svg
      data-delft="wall"
      className={cn("block h-full w-full", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <defs>
        <pattern id={patternId} width={tileSize} height={tileSize} patternUnits="userSpaceOnUse">
          <g transform={`scale(${tileSize / 100})`}>
            <TileArt spec={spec} />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}
