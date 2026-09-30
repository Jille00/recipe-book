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
 * The servings cell of the recipe page's meta strip. Renders a `<dt>`/`<dd>`
 * pair in a `<div>`, so it belongs inside the strip's `<dl>`.
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
      <dt className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
        Servings
      </dt>
      {/* 44px icon buttons (size="icon") meet the touch-target minimum; the
          negative margins keep the strip's rows even. */}
      <dd className="-mt-1 -mb-2 flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="-ml-3 print:hidden"
          onClick={onDecrement}
          disabled={scaledServings <= minServings}
          aria-label="Decrease servings"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </Button>

        <span className="min-w-[2ch] text-center font-mono text-xl tabular text-foreground">
          {scaledServings}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="print:hidden"
          onClick={onIncrement}
          disabled={scaledServings >= maxServings}
          aria-label="Increase servings"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </Button>

        {isScaled && (
          <Button
            variant="link"
            size="sm"
            onClick={onReset}
            className="ml-1 h-11 px-1 print:hidden"
            aria-label={`Reset to ${originalServings} servings`}
          >
            <span>
              Reset to <span className="font-mono tabular">{originalServings}</span>
            </span>
          </Button>
        )}
      </dd>
    </div>
  );
}
