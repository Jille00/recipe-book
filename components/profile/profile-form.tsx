"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Textarea,
  Label,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui";
import { User, Globe, MapPin, Scale, Loader2 } from "lucide-react";
import { useUnitPreferences } from "@/hooks/use-unit-preferences";
import type { UnitSystem } from "@/types/units";

interface ProfileFormProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
  };
  profile: {
    bio?: string | null;
    website?: string | null;
    location?: string | null;
  } | null;
}

export function ProfileForm({ user, profile }: ProfileFormProps) {
  const router = useRouter();
  const { globalPreference, setGlobalPreference, isLoaded } = useUnitPreferences();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: user.name || "",
    bio: profile?.bio || "",
    website: profile?.website || "",
    location: profile?.location || "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUnitSystemChange = (system: UnitSystem) => {
    setGlobalPreference(system);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      toast.success("Profile updated successfully");
      router.refresh();
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const hasChanges =
    formData.name !== (user.name || "") ||
    formData.bio !== (profile?.bio || "") ||
    formData.website !== (profile?.website || "") ||
    formData.location !== (profile?.location || "");

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profile
          </CardTitle>
          <CardDescription>
            Your public profile information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar display */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.image || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-medium">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground">{user.name || "Unnamed User"}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Your name"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              placeholder="Tell us a bit about yourself and your cooking..."
              rows={3}
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Location
            </Label>
            <Input
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="e.g., Amsterdam, Netherlands"
            />
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website" className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Website
            </Label>
            <Input
              id="website"
              name="website"
              type="url"
              value={formData.website}
              onChange={handleInputChange}
              placeholder="https://yourwebsite.com"
            />
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

      {/* Save Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || !hasChanges}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
