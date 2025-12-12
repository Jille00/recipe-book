"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Input,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
} from "@/components/ui";
import { Search, X, SlidersHorizontal } from "lucide-react";
import type { SearchFilters } from "@/lib/db/queries/search";

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface SearchFiltersFormProps {
  tags: Tag[];
  initialFilters: SearchFilters;
}

export function SearchFiltersForm({
  tags,
  initialFilters,
}: SearchFiltersFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

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
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(maxPrepTime || maxCookTime || minServings || maxServings)
  );

  // Create URL with current filters
  const createQueryString = useCallback(() => {
    const params = new URLSearchParams();

    if (query.trim()) params.set("q", query.trim());
    if (selectedTagIds.length > 0) {
      selectedTagIds.forEach((id) => params.append("tags", id));
    }
    if (difficulty) params.set("difficulty", difficulty);
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
  };

  // Toggle tag selection
  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const hasFilters =
    query ||
    selectedTagIds.length > 0 ||
    difficulty ||
    maxPrepTime ||
    maxCookTime ||
    minServings ||
    maxServings;

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSearch} className="space-y-6">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by recipe name, description, or ingredients..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-12 pl-10 pr-4 text-base"
            />
          </div>

          {/* Tag Toggles */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tags</Label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors ${
                    selectedTagIds.includes(tag.id)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {tag.name}
                  {selectedTagIds.includes(tag.id) && <X className="h-3 w-3" />}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Select */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Any difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any difficulty</SelectItem>
                  <SelectItem value="easy">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Easy
                    </span>
                  </SelectItem>
                  <SelectItem value="medium">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Medium
                    </span>
                  </SelectItem>
                  <SelectItem value="hard">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      Hard
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Filters Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {showAdvanced ? "Hide" : "Show"} advanced filters
          </button>

          {/* Advanced Filters */}
          {showAdvanced && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 p-4 rounded-lg bg-muted/30 border border-border">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Max Prep Time</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    placeholder="Any"
                    value={maxPrepTime}
                    onChange={(e) => setMaxPrepTime(e.target.value)}
                    className="h-10 pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
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
                    className="h-10 pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    min
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Min Servings</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Any"
                  value={minServings}
                  onChange={(e) => setMinServings(e.target.value)}
                  className="h-10"
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
                  className="h-10"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Searching...
                </span>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Search
                </>
              )}
            </Button>
            {hasFilters && (
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={isPending}
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
