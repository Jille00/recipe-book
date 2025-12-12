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
            <Users className="h-5 w-5 text-primary" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDecrement}
            disabled={scaledServings <= minServings}
            className="h-8 w-8 p-0"
            aria-label="Decrease servings"
          >
            <Minus className="h-4 w-4" />
          </Button>

          <span className="min-w-[2ch] text-center font-display text-2xl font-semibold text-foreground">
            {scaledServings}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={onIncrement}
            disabled={scaledServings >= maxServings}
            className="h-8 w-8 p-0"
            aria-label="Increase servings"
          >
            <Plus className="h-4 w-4" />
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
            className="mt-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
