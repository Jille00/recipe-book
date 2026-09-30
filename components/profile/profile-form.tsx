"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  Button,
  Input,
  Textarea,
  Label,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui";
import Link from "next/link";
import { Loader2, ArrowRight } from "lucide-react";
import { AccountCardHeader } from "@/components/account/account-field";
import { cn } from "@/lib/utils";
import { profilePath, validateHandle } from "@/lib/handle";
import { useUnitPreferences } from "@/hooks/use-unit-preferences";
import { useSession } from "@/lib/auth-client";
import type { UnitSystem } from "@/types/units";

/**
 * The API explains validation problems (a bad website address, a bio that is
 * too long) in a 400's `error` field. Anything else, or a body that is not
 * JSON (an HTML error page), gets a generic message.
 */
async function readErrorMessage(response: Response): Promise<string> {
  const fallback = "Failed to update profile";
  if (response.status === 401) {
    return "Your session has expired. Please sign in again.";
  }
  // 409: the handle belongs to someone else; the message says so.
  if (response.status !== 400 && response.status !== 409) return fallback;
  try {
    const data = await response.json();
    return typeof data?.error === "string" && data.error ? data.error : fallback;
  } catch {
    return fallback;
  }
}

const UNIT_OPTION =
  "flex cursor-pointer items-start gap-4 rounded-lg border-[1.5px] p-4 transition-colors duration-(--duration-fast) ease-out has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-primary/15";
const UNIT_OPTION_ON = "border-primary bg-primary/5";
const UNIT_OPTION_OFF = "border-border hover:border-primary/50";
const UNIT_RADIO = "mt-1 size-4 shrink-0 cursor-pointer accent-primary";

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
    handle?: string | null;
  } | null;
}

export function ProfileForm({ user, profile }: ProfileFormProps) {
  const router = useRouter();
  // The header reads the name from the client session, which does not know
  // about the rename until it is fetched again.
  const { refetch: refetchSession } = useSession();
  const { globalPreference, setGlobalPreference, isLoaded } = useUnitPreferences();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: user.name || "",
    bio: profile?.bio || "",
    website: profile?.website || "",
    location: profile?.location || "",
    handle: profile?.handle || "",
  });
  const [handleError, setHandleError] = useState<string | null>(null);
  // The address the profile is live at: what was last saved, not the draft.
  const savedHandle = profile?.handle || null;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handles are lowercase; typing capitals (or a leading "@") is forgiven so
  // the field shows exactly what will be saved.
  const handleHandleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/^@/, "");
    setFormData((prev) => ({ ...prev, handle: value }));
    if (handleError) setHandleError(null);
  };

  /** Same rules as the API; an empty field clears the handle. */
  const checkHandle = (): boolean => {
    if (!formData.handle.trim()) {
      setHandleError(null);
      return true;
    }
    const result = validateHandle(formData.handle);
    setHandleError(result.ok ? null : result.error);
    return result.ok;
  };

  const handleUnitSystemChange = (system: UnitSystem) => {
    setGlobalPreference(system);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkHandle()) {
      document.getElementById("handle")?.focus();
      return;
    }
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const message = await readErrorMessage(response);
        // A taken handle is shown on the field as well as in the toast.
        if (response.status === 409) {
          setHandleError(message);
          document.getElementById("handle")?.focus();
        }
        throw new Error(message);
      }

      toast.success("Profile updated successfully");
      router.refresh();
      // Not awaited for the toast; a failed refetch only leaves the header
      // stale until the next navigation.
      refetchSession().catch(() => {});
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile"
      );
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
    formData.location !== (profile?.location || "") ||
    formData.handle !== (profile?.handle || "");

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Profile Info */}
      <Card>
        <AccountCardHeader
          title="About you"
          description="Your name, bio, location and website are shown on your public profile once you pick a handle."
        />
        <CardContent className="space-y-6">
          {/* Avatar display */}
          <div className="flex items-center gap-4">
            <Avatar className="size-16 sm:size-20">
              {/* Decorative: the name is spelled out right next to it. */}
              <AvatarImage src={user.image || undefined} alt="" />
              <AvatarFallback className="bg-secondary font-display text-2xl text-secondary-foreground">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{user.name || "Unnamed user"}</p>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Display name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Your name"
            />
          </div>

          {/* Handle: the public profile address, /u/{handle} */}
          <div className="space-y-2">
            <Label htmlFor="handle">Handle</Label>
            {/* The address prefix sits inside the field, so what you type
                reads as the end of your address. */}
            <div className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-mono text-base text-muted-foreground"
              >
                /u/
              </span>
              <Input
                id="handle"
                name="handle"
                value={formData.handle}
                onChange={handleHandleChange}
                onBlur={checkHandle}
                placeholder="e.g. jille-bakes"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={31}
                aria-invalid={handleError ? true : undefined}
                aria-describedby={handleError ? "handle-hint handle-error" : "handle-hint"}
                className="pl-[3.25rem] font-mono"
              />
            </div>
            <p id="handle-hint" className="text-[13px] text-muted-foreground">
              Your public page with your public recipes:{" "}
              <span className="font-mono break-all text-primary">
                /u/{formData.handle.trim() || "your-handle"}
              </span>
              . 3 to 30 lowercase letters, numbers or hyphens. Leave empty to
              have no public page.
            </p>
            {handleError && (
              <p id="handle-error" role="alert" className="text-[13px] text-destructive">
                {handleError}
              </p>
            )}
            {savedHandle && (
              <Link
                href={profilePath(savedHandle)}
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:text-primary-hover hover:underline"
              >
                View your public profile
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
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
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="e.g. Amsterdam, Netherlands"
            />
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
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
        <AccountCardHeader
          title="Measurement units"
          description="The system recipes are shown in when you open them."
        />
        <CardContent>
          {!isLoaded ? (
            <div className="space-y-3">
              <div className="h-[74px] animate-pulse rounded-lg bg-muted" />
              <div className="h-[74px] animate-pulse rounded-lg bg-muted" />
            </div>
          ) : (
            <fieldset className="space-y-3">
              <legend className="sr-only">Measurement system</legend>
              <label
                className={cn(
                  UNIT_OPTION,
                  globalPreference === "imperial" ? UNIT_OPTION_ON : UNIT_OPTION_OFF
                )}
              >
                <input
                  type="radio"
                  name="unitSystem"
                  value="imperial"
                  checked={globalPreference === "imperial"}
                  onChange={() => handleUnitSystemChange("imperial")}
                  className={UNIT_RADIO}
                />
                <div className="flex-1">
                  <p className="font-medium text-foreground">Imperial</p>
                  <p className="text-sm text-muted-foreground">
                    Cups, tablespoons, teaspoons, ounces, pounds, Fahrenheit
                  </p>
                </div>
              </label>

              <label
                className={cn(
                  UNIT_OPTION,
                  globalPreference === "metric" ? UNIT_OPTION_ON : UNIT_OPTION_OFF
                )}
              >
                <input
                  type="radio"
                  name="unitSystem"
                  value="metric"
                  checked={globalPreference === "metric"}
                  onChange={() => handleUnitSystemChange("metric")}
                  className={UNIT_RADIO}
                />
                <div className="flex-1">
                  <p className="font-medium text-foreground">Metric</p>
                  <p className="text-sm text-muted-foreground">
                    Milliliters, liters, grams, kilograms, Celsius
                  </p>
                </div>
              </label>
            </fieldset>
          )}

          <p className="mt-4 text-[13px] text-muted-foreground">
            Saved as soon as you pick one. You can still switch units on a
            single recipe with its toggle.
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || !hasChanges}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {isSubmitting ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
