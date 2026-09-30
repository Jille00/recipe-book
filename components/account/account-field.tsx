"use client";

import type { ComponentProps, ReactNode } from "react";
import { CardDescription, CardHeader, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";

interface AccountFieldProps extends Omit<ComponentProps<typeof Input>, "id" | "name"> {
  /** Used for the id and name, so the form can focus the first bad field. */
  id: string;
  label: string;
  hint?: string;
  error?: string;
}

/**
 * A labelled input with an optional hint and an error that screen readers
 * announce with the field (aria-describedby), like the sign-in forms.
 */
export function AccountField({ id, label, hint, error, ...inputProps }: AccountFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...inputProps}
      />
      {hint && (
        <p id={hintId} className="text-[13px] text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-[13px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** A form-level error, announced as soon as it appears. */
export function FormAlert({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
    >
      {message}
    </div>
  );
}

/**
 * The header every account and profile card shares: an optional eyebrow, a
 * Gloock title (an h2 under the page's h1) and a line of guidance in slate.
 */
export function AccountCardHeader({
  title,
  description,
  eyebrow,
  className,
}: {
  title: string;
  description?: ReactNode;
  /** A small uppercase label above the title, only when it says something true. */
  eyebrow?: string;
  className?: string;
}) {
  return (
    <CardHeader className={cn("gap-1.5", className)}>
      {eyebrow && (
        <p className="text-xs font-medium tracking-[0.06em] text-muted-foreground uppercase">
          {eyebrow}
        </p>
      )}
      <h2 className="text-[22px] leading-tight text-foreground">{title}</h2>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
  );
}

/**
 * A quiet confirmation panel (e.g. "Check your inbox"): glaze surface, delft
 * icon, text in ink and slate.
 */
export function NoticePanel({
  icon,
  title,
  children,
  role,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  role?: "status";
}) {
  return (
    <div role={role} className="flex items-start gap-3 rounded-lg bg-muted p-4">
      <span className="mt-0.5 shrink-0 text-primary [&_svg]:size-5">{icon}</span>
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        {children}
      </div>
    </div>
  );
}

/** Focuses the named control of `form`, e.g. the first field with an error. */
export function focusField(form: HTMLFormElement | null, name: string | undefined) {
  if (!form || !name) return;
  const element = form.elements.namedItem(name);
  if (element instanceof HTMLElement) element.focus();
}
