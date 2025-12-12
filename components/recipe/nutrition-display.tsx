"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Label,
} from "@/components/ui";
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
  const [editValues, setEditValues] = useState<NutritionInfo | null>(nutrition);

  const handleSave = () => {
    if (editValues && onEdit) {
      onEdit(editValues);
    }
  };

  const handleInputChange = (key: keyof NutritionInfo, value: string) => {
    if (!editValues) return;

    if (key === "confidence" || key === "warnings") return;

    const numValue = value === "" ? null : parseFloat(value);
    setEditValues({
      ...editValues,
      [key]: numValue,
    });
  };

  if (!nutrition) {
    return null;
  }

  if (isEditing && editValues) {
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
                value={editValues[key] ?? ""}
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
