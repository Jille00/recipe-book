"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui";
import { Label } from "@/components/ui";
import { Scale } from "lucide-react";
import { useUnitPreferences } from "@/hooks/use-unit-preferences";
import type { UnitSystem } from "@/types/units";

interface SettingsFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
}

export function SettingsForm({ user }: SettingsFormProps) {
  const { globalPreference, setGlobalPreference, isLoaded } = useUnitPreferences();

  const handleUnitSystemChange = (system: UnitSystem) => {
    setGlobalPreference(system);
  };

  return (
    <div className="space-y-6">
      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Account</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label className="text-muted-foreground">Name</Label>
            <p className="font-medium text-foreground">{user.name}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-muted-foreground">Email</Label>
            <p className="font-medium text-foreground">{user.email}</p>
          </div>
        </CardContent>
      </Card>

      {/* Unit Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Measurement Units
          </CardTitle>
          <CardDescription>
            Choose your preferred measurement system for recipe ingredients
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isLoaded ? (
            <div className="space-y-3">
              <div className="h-14 animate-pulse rounded-lg bg-muted" />
              <div className="h-14 animate-pulse rounded-lg bg-muted" />
            </div>
          ) : (
            <div className="space-y-3">
              <label
                className={`flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors ${
                  globalPreference === "imperial"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <input
                  type="radio"
                  name="unitSystem"
                  value="imperial"
                  checked={globalPreference === "imperial"}
                  onChange={() => handleUnitSystemChange("imperial")}
                  className="mt-1 h-4 w-4 border-border text-primary focus:ring-primary/50"
                />
                <div className="flex-1">
                  <p className="font-medium text-foreground">Imperial</p>
                  <p className="text-sm text-muted-foreground">
                    Cups, tablespoons, teaspoons, ounces, pounds, Fahrenheit
                  </p>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors ${
                  globalPreference === "metric"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <input
                  type="radio"
                  name="unitSystem"
                  value="metric"
                  checked={globalPreference === "metric"}
                  onChange={() => handleUnitSystemChange("metric")}
                  className="mt-1 h-4 w-4 border-border text-primary focus:ring-primary/50"
                />
                <div className="flex-1">
                  <p className="font-medium text-foreground">Metric</p>
                  <p className="text-sm text-muted-foreground">
                    Milliliters, liters, grams, kilograms, Celsius
                  </p>
                </div>
              </label>
            </div>
          )}

          <p className="mt-4 text-sm text-muted-foreground">
            This sets your default preference. You can still switch units on individual recipes using the toggle.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
