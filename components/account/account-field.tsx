"use client";

import type { ComponentProps } from "react";
import { Input, Label } from "@/components/ui";

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
        <p id={hintId} className="text-xs text-muted-foreground">
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
      className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
    >
      {message}
    </div>
  );
}

/** Focuses the named control of `form`, e.g. the first field with an error. */
export function focusField(form: HTMLFormElement | null, name: string | undefined) {
  if (!form || !name) return;
  const element = form.elements.namedItem(name);
  if (element instanceof HTMLElement) element.focus();
}
