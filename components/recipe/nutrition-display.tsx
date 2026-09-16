"use client";

import { useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import {
  Apple,
  Beef,
  Wheat,
  Droplet,
  Leaf,
  Cookie,
  AlertCircle,
  Pencil,
  X,
  Check,
} from "lucide-react";
import type { NutritionInfo } from "@/types/nutrition";

interface NutritionDisplayProps {
  nutrition: NutritionInfo | null;
  servings?: number | null;
  isEditable?: boolean;
  isEditing?: boolean;
  onEdit?: (nutrition: NutritionInfo) => void;
  onStartEdit?: () => void;
  onCancelEdit?: () => void;
}

const NUTRIENT_CONFIG = [
  { key: "calories", label: "Calories", unit: "kcal", icon: Apple, color: "text-red-500" },
  { key: "protein", label: "Protein", unit: "g", icon: Beef, color: "text-amber-600" },
  { key: "carbs", label: "Carbs", unit: "g", icon: Wheat, color: "text-yellow-600" },
  { key: "fat", label: "Fat", unit: "g", icon: Droplet, color: "text-orange-500" },
  { key: "fiber", label: "Fiber", unit: "g", icon: Leaf, color: "text-green-600" },
  { key: "sugar", label: "Sugar", unit: "g", icon: Cookie, color: "text-pink-500" },
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

function fromDrafts(
  base: NutritionInfo,
  drafts: Record<NutrientKey, string>
): NutritionInfo {
  const next: NutritionInfo = { ...base };
  for (const { key } of NUTRIENT_CONFIG) {
    const raw = drafts[key].trim();
    const parsed = raw === "" ? NaN : Number(raw);
    next[key] = Number.isFinite(parsed) ? parsed : null;
  }
  return next;
}

function getConfidenceBadgeStyles(confidence: "high" | "medium" | "low") {
  switch (confidence) {
    case "high":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "medium":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "low":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  }
}

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

  const handleSave = () => {
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
          {NUTRIENT_CONFIG.map(({ key, label, unit }) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`nutrition-${key}`} className="text-xs text-muted-foreground">
                {label} ({unit})
              </Label>
              <Input
                id={`nutrition-${key}`}
                type="number"
                min="0"
                step={key === "calories" ? "1" : "0.1"}
                value={drafts[key] ?? ""}
                onChange={(e) => handleInputChange(key, e.target.value)}
                className="h-9"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancelEdit}
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
          >
            <Check className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Nutrient Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {NUTRIENT_CONFIG.map(({ key, label, unit, icon: Icon, color }) => {
          const value = nutrition[key];
          return (
            <div
              key={key}
              className="flex flex-col items-center p-3 rounded-xl bg-muted/30 border border-border/50"
            >
              <Icon className={`h-5 w-5 ${color} mb-1.5`} />
              <span className="text-lg font-semibold text-foreground">
                {value !== null ? (key === "calories" ? Math.round(value) : value.toFixed(1)) : "—"}
              </span>
              <span className="text-xs text-muted-foreground">
                {label} {value !== null && `(${unit})`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer with confidence and edit button */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConfidenceBadgeStyles(nutrition.confidence)}`}
          >
            {nutrition.confidence.charAt(0).toUpperCase() + nutrition.confidence.slice(1)} confidence
          </span>
          {servings && (
            <span className="text-xs text-muted-foreground">
              per serving ({servings} servings)
            </span>
          )}
        </div>
        {isEditable && onStartEdit && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onStartEdit}
            className="text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit
          </Button>
        )}
      </div>

      {/* Warnings */}
      {nutrition.warnings && nutrition.warnings.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            {nutrition.warnings.map((warning, i) => (
              <p key={i}>{warning}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
