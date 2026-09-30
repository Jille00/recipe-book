"use client";

import { useState } from "react";
import { Badge, Button, Input, Label } from "@/components/ui";
import { AlertCircle, Pencil, X, Check } from "lucide-react";
import type { NutritionInfo } from "@/types/nutrition";

interface NutritionDisplayProps {
  nutrition: NutritionInfo | null;
  /**
   * The servings the per-serving values were calculated for (the recipe's own
   * servings) - not a scaled count, since the values do not change with it.
   */
  servings?: number | null;
  isEditable?: boolean;
  isEditing?: boolean;
  onEdit?: (nutrition: NutritionInfo) => void;
  onStartEdit?: () => void;
  onCancelEdit?: () => void;
}

const NUTRIENT_CONFIG = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
  { key: "fiber", label: "Fiber", unit: "g" },
  { key: "sugar", label: "Sugar", unit: "g" },
] as const;

type NutrientKey = (typeof NUTRIENT_CONFIG)[number]["key"];

/**
 * The editable fields are kept as raw strings while editing. Round-tripping
 * through `parseFloat` stripped a trailing decimal point, so typing "12.5"
 * lost the "." on the keystroke after it and produced "125".
 */
function toDrafts(nutrition: NutritionInfo | null): Record<NutrientKey, string> {
  const drafts = {} as Record<NutrientKey, string>;
  for (const { key } of NUTRIENT_CONFIG) {
    const value = nutrition?.[key];
    drafts[key] = value === null || value === undefined ? "" : String(value);
  }
  return drafts;
}

/**
 * A draft is invalid when it is filled in but is not a finite number >= 0.
 * The save schema rejects negative values, so letting one through made the
 * whole recipe save fail.
 */
function isInvalidDraft(raw: string): boolean {
  const trimmed = raw.trim();
  if (trimmed === "") return false;
  const parsed = Number(trimmed);
  return !Number.isFinite(parsed) || parsed < 0;
}

function fromDrafts(
  base: NutritionInfo,
  drafts: Record<NutrientKey, string>
): NutritionInfo {
  const next: NutritionInfo = { ...base };
  for (const { key } of NUTRIENT_CONFIG) {
    const raw = drafts[key].trim();
    const parsed = raw === "" ? NaN : Number(raw);
    // Belt and braces: Save is disabled while a draft is invalid, but never
    // hand a negative value to the recipe.
    next[key] = Number.isFinite(parsed) ? Math.max(0, parsed) : null;
  }
  return next;
}

const CONFIDENCE_BADGE_VARIANT = {
  high: "success",
  medium: "warning",
  low: "danger",
} as const;

export function NutritionDisplay({
  nutrition,
  servings,
  isEditable = false,
  isEditing = false,
  onEdit,
  onStartEdit,
  onCancelEdit,
}: NutritionDisplayProps) {
  const [drafts, setDrafts] = useState<Record<NutrientKey, string>>(() =>
    toDrafts(nutrition)
  );
  // Reset the drafts when the nutrition prop changes (React's "adjust state
  // during render" pattern - no effect, no extra render pass).
  const [lastNutrition, setLastNutrition] = useState(nutrition);
  if (lastNutrition !== nutrition) {
    setLastNutrition(nutrition);
    setDrafts(toDrafts(nutrition));
  }

  const invalidKeys = NUTRIENT_CONFIG.filter(({ key }) =>
    isInvalidDraft(drafts[key] ?? "")
  ).map(({ key }) => key);
  const hasInvalid = invalidKeys.length > 0;

  const handleSave = () => {
    if (hasInvalid) return;
    if (nutrition && onEdit) {
      onEdit(fromDrafts(nutrition, drafts));
    }
  };

  const handleInputChange = (key: NutrientKey, value: string) => {
    setDrafts((prev) => ({ ...prev, [key]: value }));
  };

  if (!nutrition) {
    return null;
  }

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {NUTRIENT_CONFIG.map(({ key, label, unit }) => {
            const invalid = invalidKeys.includes(key);
            return (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`nutrition-${key}`} className="text-xs text-muted-foreground">
                  {label} ({unit})
                </Label>
                <Input
                  id={`nutrition-${key}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step={key === "calories" ? "1" : "0.1"}
                  value={drafts[key] ?? ""}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  aria-invalid={invalid || undefined}
                  aria-describedby={invalid ? "nutrition-edit-error" : undefined}
                />
              </div>
            );
          })}
        </div>
        {hasInvalid && (
          <p
            id="nutrition-edit-error"
            role="alert"
            className="flex items-center gap-1.5 text-[13px] text-destructive"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Values can&apos;t be negative.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancelEdit}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Cancel
          </Button>
          {/* Secondary: this sits inside the recipe form, whose main action
              (saving the recipe) owns the orange. */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSave}
            disabled={hasInvalid}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Nutrients: label over a Plex Mono value */}
      <dl className="grid grid-cols-3 gap-x-4 gap-y-5 sm:grid-cols-6">
        {NUTRIENT_CONFIG.map(({ key, label, unit }) => {
          const value = nutrition[key];
          return (
            <div key={key}>
              <dt className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
                {label}
              </dt>
              <dd className="mt-1 whitespace-nowrap">
                {value !== null && value !== undefined ? (
                  <>
                    <span className="font-mono text-xl tabular text-foreground">
                      {key === "calories" ? Math.round(value) : value.toFixed(1)}
                    </span>
                    <span className="ml-1 text-sm text-muted-foreground">{unit}</span>
                  </>
                ) : (
                  <span className="font-mono text-xl text-muted-foreground">
                    <span aria-hidden="true">—</span>
                    <span className="sr-only">Unknown</span>
                  </span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>

      {/* Footer with confidence and edit button */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={CONFIDENCE_BADGE_VARIANT[nutrition.confidence]}>
            {nutrition.confidence.charAt(0).toUpperCase() + nutrition.confidence.slice(1)} confidence
          </Badge>
          {servings ? (
            <span className="text-xs text-muted-foreground">
              Per serving, for{" "}
              <span className="font-mono tabular">{servings}</span> servings
            </span>
          ) : null}
        </div>
        {isEditable && onStartEdit && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onStartEdit}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Edit
          </Button>
        )}
      </div>

      {/* Warnings */}
      {nutrition.warnings && nutrition.warnings.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-warning dark:border-warning-light/30 dark:bg-warning-light/15 dark:text-warning-light">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="text-sm">
            {nutrition.warnings.map((warning, i) => (
              <p key={i}>{warning}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
