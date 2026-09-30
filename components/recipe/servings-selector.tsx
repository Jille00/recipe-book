"use client";

import { Minus, Plus, RotateCcw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ServingsSelectorProps {
  scaledServings: number;
  originalServings: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onReset: () => void;
  minServings?: number;
  maxServings?: number;
}

export function ServingsSelector({
  scaledServings,
  originalServings,
  onIncrement,
  onDecrement,
  onReset,
  minServings = 1,
  maxServings = 99,
}: ServingsSelectorProps) {
  const isScaled = scaledServings !== originalServings;

  return (
    <Card>
      <CardContent className="py-4 text-center">
        <div className="mb-2 flex justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
        </div>

        {/* 44px icon buttons (size="icon") meet the touch-target minimum */}
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onDecrement}
            disabled={scaledServings <= minServings}
            aria-label="Decrease servings"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </Button>

          <span className="min-w-[2ch] text-center font-display text-2xl font-semibold text-foreground">
            {scaledServings}
          </span>

          <Button
            variant="ghost"
            size="icon"
            onClick={onIncrement}
            disabled={scaledServings >= maxServings}
            aria-label="Increase servings"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <p className="mt-1 text-xs text-muted-foreground">
          Servings
          {isScaled && (
            <span className="ml-1 text-primary">
              (originally {originalServings})
            </span>
          )}
        </p>

        {isScaled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="mt-2 text-xs"
          >
            <RotateCcw className="mr-1 h-3 w-3" aria-hidden="true" />
            Reset
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
