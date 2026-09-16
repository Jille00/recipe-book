"use client";

import { Scale } from "lucide-react";
import { Button } from "@/components/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import { useRecipeUnitSystem } from "@/hooks/use-unit-preferences";
import type { UnitSystem } from "@/types/units";
import { getSystemDisplayName } from "@/lib/utils/unit-conversion";

interface UnitToggleProps {
  recipeId: string;
}

export function UnitToggle({ recipeId }: UnitToggleProps) {
  const { unitSystem, setUnitSystem } = useRecipeUnitSystem(recipeId);

  const handleSystemChange = (value: string) => {
    setUnitSystem(value as UnitSystem);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          // Below `sm` the label span is hidden, which would leave the trigger
          // with no accessible name at all. The aria-label names the control
          // and exposes the current system at every breakpoint.
          aria-label={`Unit system: ${getSystemDisplayName(unitSystem)}`}
        >
          <Scale className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">
            {getSystemDisplayName(unitSystem)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={unitSystem}
          onValueChange={handleSystemChange}
        >
          <DropdownMenuRadioItem value="imperial">
            Imperial (cups, oz, °F)
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="metric">
            Metric (ml, g, °C)
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
