"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ServingsSelectorProps {
  scaledServings: number;
  originalServings: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onReset: () => void;
  minServings?: number;
  maxServings?: number;
  className?: string;
}

/**
 * The servings row of the recipe page's facts. Renders a `<dt>`/`<dd>` pair in
 * a `<div>`, so it belongs inside that `<dl>`. The stepper is one outlined
 * pill holding both buttons and the number.
 */
export function ServingsSelector({
  scaledServings,
  originalServings,
  onIncrement,
  onDecrement,
  onReset,
  minServings = 1,
  maxServings = 99,
  className,
}: ServingsSelectorProps) {
  const isScaled = scaledServings !== originalServings;

  return (
    <div className={className}>
      <dt className="font-semibold">Serves</dt>
      <dd className="flex items-center gap-2">
        {isScaled && (
          <Button
            variant="link"
            size="sm"
            onClick={onReset}
            className="h-11 px-1 print:hidden"
            aria-label={`Reset to ${originalServings} servings`}
          >
            <span>
              Reset to <span className="tabular">{originalServings}</span>
            </span>
          </Button>
        )}
        {/* 44px icon buttons meet the touch-target minimum. */}
        <span className="flex h-12 items-center rounded-full border-2 border-foreground px-0.5 print:border-0">
        <Button
          variant="ghost"
          size="icon"
          className="size-11 print:hidden"
          onClick={onDecrement}
          disabled={scaledServings <= minServings}
          aria-label="Decrease servings"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </Button>

        <span className="min-w-[2ch] text-center text-xl font-bold tabular text-foreground">
          {scaledServings}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="size-11 print:hidden"
          onClick={onIncrement}
          disabled={scaledServings >= maxServings}
          aria-label="Increase servings"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>
        </span>
      </dd>
    </div>
  );
}
