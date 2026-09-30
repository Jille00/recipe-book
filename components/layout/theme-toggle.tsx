"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  THEME_OPTIONS,
  type ThemeChoice,
  themeButtonLabel,
  toThemeChoice,
} from "@/lib/theme";

const THEME_ICONS: Record<ThemeChoice, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const noopSubscribe = () => () => {};

/**
 * The stored theme is only known in the browser (localStorage), so the server
 * render and the first client render show a neutral state; this flips to true
 * right after hydration without a mismatch.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

const TRIGGER_CLASS = "rounded-md";

/**
 * Desktop header: a 44px icon button opening a light / dark / system menu.
 *
 * Radix gives the menu trigger a generated id (and aria-controls) from
 * React's useId. The server and the hydrating client could disagree on it,
 * so until mount this renders a plain button of the same size and look; the
 * real menu takes its place right after hydration, when ids no longer have
 * to match any server markup.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(TRIGGER_CLASS, className)}
        aria-label="Change theme"
      >
        <Sun className="size-5" aria-hidden="true" />
      </Button>
    );
  }

  const choice = toThemeChoice(theme);
  // The icon shows what is on screen, so "system" shows the sun or moon.
  const Icon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(TRIGGER_CLASS, className)}
          aria-label={themeButtonLabel(theme, resolvedTheme)}
        >
          <Icon className="size-5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Theme
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={choice}
          onValueChange={(value) => setTheme(toThemeChoice(value))}
        >
          {THEME_OPTIONS.map(({ value, label }) => {
            const OptionIcon = THEME_ICONS[value];
            return (
              <DropdownMenuRadioItem key={value} value={value} className="min-h-11">
                <OptionIcon className="size-4" aria-hidden="true" />
                {label}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Mobile menu: the three choices side by side as a single-select group
 * (radio semantics and arrow-key navigation come from Radix ToggleGroup).
 */
export function ThemeSegmentedControl({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <span id="theme-control-label" className="text-sm font-medium text-muted-foreground">
        Theme
      </span>
      <ToggleGroup
        type="single"
        aria-labelledby="theme-control-label"
        value={mounted ? toThemeChoice(theme) : ""}
        // Radix lets a single group be emptied by pressing the active item;
        // a theme must always be selected, so ignore that.
        onValueChange={(value) => {
          if (value) setTheme(toThemeChoice(value));
        }}
        className="rounded-md border border-border bg-card p-0.5"
      >
        {THEME_OPTIONS.map(({ value, label }) => {
          const OptionIcon = THEME_ICONS[value];
          return (
            <ToggleGroupItem
              key={value}
              value={value}
              // Selected: glaze fill with delft text, like the mobile nav links.
              className="h-11 min-w-11 gap-1.5 rounded-md px-3 text-muted-foreground hover:bg-accent hover:text-foreground data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground data-[spacing=0]:rounded-md"
            >
              <OptionIcon className="size-4" aria-hidden="true" />
              <span className="text-sm">{label}</span>
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
