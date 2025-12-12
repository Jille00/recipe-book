"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button, Spinner } from "@/components/ui";
import {
  Camera,
  Upload,
  Check,
  AlertTriangle,
  Clock,
  Users,
  ChefHat,
  X,
  Plus,
} from "lucide-react";
import type { ExtractedRecipe, ExtractionResponse } from "@/types/extraction";
import type { Category } from "@/types/recipe";

interface RecipeImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: ExtractedRecipe) => void;
  categories: Category[];
}

type ModalState = "idle" | "extracting" | "preview" | "error";

interface SelectedFile {
  file: File;
  previewUrl: string;
}

export function RecipeImportModal({
  open,
  onOpenChange,
  onImport,
  categories,
}: RecipeImportModalProps) {
  const [state, setState] = useState<ModalState>("idle");
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedRecipe | null>(
    null
  );
  const [confidence, setConfidence] = useState<"high" | "medium" | "low" | null>(
    null
  );
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setState("idle");
    selectedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setSelectedFiles([]);
    setExtractedData(null);
    setConfidence(null);
    setWarnings([]);
    setError(null);
  }, [selectedFiles]);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        resetState();
      }
      onOpenChange(isOpen);
    },
    [onOpenChange, resetState]
  );

  const handleFilesSelect = useCallback((files: FileList | File[]) => {
    const newFiles: SelectedFile[] = Array.from(files).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setSelectedFiles((prev) => [...prev, ...newFiles]);
    setError(null);
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => {
      const removed = prev[index];
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFilesSelect(e.dataTransfer.files);
      }
    },
    [handleFilesSelect]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFilesSelect(e.target.files);
        // Reset input so same files can be selected again
        e.target.value = "";
      }
    },
    [handleFilesSelect]
  );

  const handleExtract = async () => {
    if (selectedFiles.length === 0) return;

    setError(null);
    setState("extracting");

    try {
      const formData = new FormData();
      selectedFiles.forEach((sf) => {
        formData.append("files", sf.file);
      });

      const response = await fetch("/api/extract-recipe", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Extraction failed");
      }

      const extractionData = data as ExtractionResponse;
      setExtractedData(extractionData.recipe);
      setConfidence(extractionData.confidence);
      setWarnings(extractionData.warnings || []);
      setState("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract recipe");
      setState("error");
    }
  };

  const handleApply = () => {
    if (extractedData) {
      onImport(extractedData);
      handleOpenChange(false);
    }
  };

  const matchCategory = (suggestedCategory: string | undefined): string => {
    if (!suggestedCategory) return "";
    const normalized = suggestedCategory.toLowerCase().trim();
    const exact = categories.find((c) => c.name.toLowerCase() === normalized);
    if (exact) return exact.name;
    const partial = categories.find(
      (c) =>
        c.name.toLowerCase().includes(normalized) ||
        normalized.includes(c.name.toLowerCase())
    );
    if (partial) return partial.name;
    return suggestedCategory;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Import Recipe from Image
          </DialogTitle>
          <DialogDescription>
            Upload a photo of a recipe (cookbook page, handwritten card, or
            screenshot) and we&apos;ll extract the details automatically.
          </DialogDescription>
        </DialogHeader>

        {state === "idle" && (
          <div className="space-y-4">
            {/* Dropzone */}
            <div
              className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Camera className="h-6 w-6 text-primary" />
              </div>
              <p className="mb-1 text-sm text-foreground">
                <span className="font-medium">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, or WebP (max. 10MB per image, up to 10 images)
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                Select Images
              </Button>
            </div>

            {/* Selected Images Grid */}
            {selectedFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {selectedFiles.length} image{selectedFiles.length !== 1 ? "s" : ""} selected
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      selectedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
                      setSelectedFiles([]);
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    Clear all
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {selectedFiles.map((sf, index) => (
                    <div
                      key={index}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
                    >
                      <Image
                        src={sf.previewUrl}
                        alt={`Image ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/80"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <span className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white">
                        {index + 1}
                      </span>
                    </div>
                  ))}
                  {selectedFiles.length < 10 && (
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
                    >
                      <Plus className="h-6 w-6 text-muted-foreground" />
                    </button>
                  )}
                </div>
                <Button type="button" onClick={handleExtract} className="w-full">
                  <ChefHat className="h-4 w-4" />
                  Extract Recipe from {selectedFiles.length} Image{selectedFiles.length !== 1 ? "s" : ""}
                </Button>
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleChange}
              multiple
              className="hidden"
            />
          </div>
        )}

        {state === "extracting" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" />
            <p className="mt-4 text-sm text-muted-foreground">
              Extracting recipe from image...
            </p>
            <p className="text-xs text-muted-foreground">
              This may take a few seconds
            </p>
          </div>
        )}

        {state === "error" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-7 w-7 text-destructive" />
              </div>
              <p className="font-medium text-foreground">Extraction Failed</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetState}>
                Try Again
              </Button>
            </DialogFooter>
          </div>
        )}

        {state === "preview" && extractedData && (
          <div className="space-y-4">
            {confidence && confidence !== "high" && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-400">
                    {confidence === "medium"
                      ? "Some parts were unclear"
                      : "Image quality was limited"}
                  </p>
                  {warnings.length > 0 && (
                    <ul className="mt-1 text-amber-600 dark:text-amber-300">
                      {warnings.map((w, i) => (
                        <li key={i}>• {w}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold">{extractedData.title}</h3>
                {extractedData.description && (
                  <p className="text-sm text-muted-foreground">
                    {extractedData.description}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3 text-sm">
                {extractedData.prepTimeMinutes && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Prep: {extractedData.prepTimeMinutes} min</span>
                  </div>
                )}
                {extractedData.cookTimeMinutes && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Cook: {extractedData.cookTimeMinutes} min</span>
                  </div>
                )}
                {extractedData.servings && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{extractedData.servings} servings</span>
                  </div>
                )}
                {extractedData.difficulty && (
                  <span className="capitalize text-muted-foreground">
                    {extractedData.difficulty}
                  </span>
                )}
                {extractedData.suggestedCategory && (
                  <span className="text-muted-foreground">
                    {matchCategory(extractedData.suggestedCategory)}
                  </span>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-2">
                    Ingredients ({extractedData.ingredients.length})
                  </h4>
                  <ul className="space-y-1 text-sm max-h-40 overflow-y-auto">
                    {extractedData.ingredients.map((ing, i) => (
                      <li key={i} className="text-muted-foreground">
                        {ing.amount && `${ing.amount} `}
                        {ing.unit && `${ing.unit} `}
                        {ing.text}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">
                    Instructions ({extractedData.instructions.length} steps)
                  </h4>
                  <ol className="space-y-1 text-sm max-h-40 overflow-y-auto">
                    {extractedData.instructions.map((inst) => (
                      <li key={inst.step} className="text-muted-foreground">
                        <span className="font-medium">{inst.step}.</span>{" "}
                        {inst.text.length > 80
                          ? `${inst.text.slice(0, 80)}...`
                          : inst.text}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetState}>
                Try Different Image
              </Button>
              <Button onClick={handleApply}>
                <Check className="h-4 w-4" />
                Apply to Form
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
