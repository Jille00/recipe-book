"use client";

import { useState, useCallback, useTransition, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Input,
  Button,
  Label,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Separator,
} from "@/components/ui";
import { Search, SlidersHorizontal, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchFilters } from "@/lib/db/queries/search";

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface BrowseFiltersProps {
  tags: Tag[];
  initialFilters: SearchFilters;
}

export function BrowseFilters({ tags, initialFilters }: BrowseFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Local state for form inputs
  const [query, setQuery] = useState(initialFilters.query || "");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    initialFilters.tagIds || []
  );
  const [difficulty, setDifficulty] = useState(
    initialFilters.difficulty || ""
  );
  const [maxPrepTime, setMaxPrepTime] = useState(
    initialFilters.maxPrepTime?.toString() || ""
  );
  const [maxCookTime, setMaxCookTime] = useState(
    initialFilters.maxCookTime?.toString() || ""
  );
  const [minServings, setMinServings] = useState(
    initialFilters.minServings?.toString() || ""
  );
  const [maxServings, setMaxServings] = useState(
    initialFilters.maxServings?.toString() || ""
  );

  // Count active filters (excluding search query)
  const activeFilterCount = [
    selectedTagIds.length > 0,
    difficulty,
    maxPrepTime,
    maxCookTime,
    minServings,
    maxServings,
  ].filter(Boolean).length + (selectedTagIds.length > 0 ? selectedTagIds.length - 1 : 0);

  // Create URL with current filters
  const createQueryString = useCallback(() => {
    const params = new URLSearchParams();

    if (query.trim()) params.set("q", query.trim());
    if (selectedTagIds.length > 0) {
      selectedTagIds.forEach((id) => params.append("tags", id));
    }
    if (difficulty && difficulty !== "any") params.set("difficulty", difficulty);
    if (maxPrepTime) params.set("prepTime", maxPrepTime);
    if (maxCookTime) params.set("cookTime", maxCookTime);
    if (minServings) params.set("minServings", minServings);
    if (maxServings) params.set("maxServings", maxServings);

    return params.toString();
  }, [
    query,
    selectedTagIds,
    difficulty,
    maxPrepTime,
    maxCookTime,
    minServings,
    maxServings,
  ]);

  // Submit search
  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    startTransition(() => {
      const queryString = createQueryString();
      router.push(queryString ? `${pathname}?${queryString}` : pathname);
    });
    setIsPopoverOpen(false);
  };

  // Apply filters from popover
  const applyFilters = () => {
    handleSearch();
  };

  // Clear all filters
  const handleClear = () => {
    setQuery("");
    setSelectedTagIds([]);
    setDifficulty("");
    setMaxPrepTime("");
    setMaxCookTime("");
    setMinServings("");
    setMaxServings("");
    startTransition(() => {
      router.push(pathname);
    });
    setIsPopoverOpen(false);
  };

  // Toggle tag selection
  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  // Remove a single tag
  const removeTag = (tagId: string) => {
    setSelectedTagIds((prev) => prev.filter((id) => id !== tagId));
    // Trigger search after removing tag
    setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      const newTagIds = selectedTagIds.filter((id) => id !== tagId);
      if (newTagIds.length > 0) {
        newTagIds.forEach((id) => params.append("tags", id));
      }
      if (difficulty && difficulty !== "any") params.set("difficulty", difficulty);
      if (maxPrepTime) params.set("prepTime", maxPrepTime);
      if (maxCookTime) params.set("cookTime", maxCookTime);
      if (minServings) params.set("minServings", minServings);
      if (maxServings) params.set("maxServings", maxServings);
      const queryString = params.toString();
      startTransition(() => {
        router.push(queryString ? `${pathname}?${queryString}` : pathname);
      });
    }, 0);
  };

  const hasFilters =
    query ||
    selectedTagIds.length > 0 ||
    difficulty ||
    maxPrepTime ||
    maxCookTime ||
    minServings ||
    maxServings;

  // Get tag names for selected tags
  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));

  return (
    <div className="space-y-4">
      {/* Search bar with filter button */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search recipes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 pl-10 pr-4 text-base"
          />
        </div>

        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-12 gap-2 px-4"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 p-0"
            align="end"
            sideOffset={8}
          >
            <div className="p-4 space-y-4">
              <div className="font-medium">Filters</div>

              {/* Tags */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tags</Label>
                <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border p-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                        selectedTagIds.includes(tag.id)
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border",
                          selectedTagIds.includes(tag.id)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {selectedTagIds.includes(tag.id) && (
                          <Check className="h-3 w-3" />
                        )}
                      </div>
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Difficulty */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Difficulty</Label>
                <div className="flex gap-2">
                  {[
                    { value: "", label: "Any" },
                    { value: "easy", label: "Easy", color: "bg-emerald-500" },
                    { value: "medium", label: "Medium", color: "bg-amber-500" },
                    { value: "hard", label: "Hard", color: "bg-red-500" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDifficulty(option.value)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
                        difficulty === option.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      {option.color && (
                        <span className={cn("h-2 w-2 rounded-full", option.color)} />
                      )}
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Time Filters */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Max Prep Time</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      placeholder="Any"
                      value={maxPrepTime}
                      onChange={(e) => setMaxPrepTime(e.target.value)}
                      className="h-9 pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      min
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Max Cook Time</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      placeholder="Any"
                      value={maxCookTime}
                      onChange={(e) => setMaxCookTime(e.target.value)}
                      className="h-9 pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      min
                    </span>
                  </div>
                </div>
              </div>

              {/* Servings Filters */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Min Servings</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Any"
                    value={minServings}
                    onChange={(e) => setMinServings(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Max Servings</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Any"
                    value={maxServings}
                    onChange={(e) => setMaxServings(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 border-t p-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={!hasFilters}
                className="flex-1"
              >
                Clear All
              </Button>
              <Button
                type="button"
                onClick={applyFilters}
                disabled={isPending}
                className="flex-1"
              >
                {isPending ? "Applying..." : "Apply Filters"}
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button type="submit" disabled={isPending} className="h-12">
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span className="hidden sm:inline">Searching...</span>
            </span>
          ) : (
            <>
              <Search className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Search</span>
            </>
          )}
        </Button>
      </form>

      {/* Active tag badges below search bar */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
            >
              {tag.name}
              <button
                type="button"
                onClick={() => removeTag(tag.id)}
                className="ml-1 rounded-full p-0.5 hover:bg-primary/20"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove {tag.name}</span>
              </button>
            </span>
          ))}
          {selectedTags.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setSelectedTagIds([]);
                handleSearch();
              }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Clear all tags
            </button>
          )}
        </div>
      )}
    </div>
  );
}
