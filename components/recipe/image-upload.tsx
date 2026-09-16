"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { Button, Spinner } from "@/components/ui";
import { ImagePlus, Upload, X, RefreshCw, Sparkles } from "lucide-react";
import { compressImage } from "@/lib/image/compress-image";
import {
  UPLOAD_BUDGET_BYTES,
  UPLOAD_IMAGE_TYPES,
  UPLOAD_PASSTHROUGH_TYPES,
  parseJsonResponse,
  validateImageFile,
} from "./file-validation";

interface RecipeContext {
  title: string;
  description?: string;
  ingredients?: Array<{ text: string }>;
  instructions?: Array<{ text: string }>;
}

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  recipeContext?: RecipeContext;
}

export function ImageUpload({
  value,
  onChange,
  recipeContext,
}: ImageUploadProps) {
  // "preparing" = shrinking the photo in the browser, "uploading" = POSTing it.
  const [uploadPhase, setUploadPhase] = useState<
    "preparing" | "uploading" | null
  >(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      // Validate before we spend a round trip - and before drag-and-drop can
      // sneak past the input's `accept` filter.
      const validationError = validateImageFile(file, UPLOAD_IMAGE_TYPES);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      setUploadPhase("preparing");

      try {
        // Vercel rejects request bodies over ~4.5MB before our route runs, so
        // shrink large photos in the browser first.
        const prepared = await compressImage(file, {
          maxBytes: UPLOAD_BUDGET_BYTES,
          keepTypes: UPLOAD_PASSTHROUGH_TYPES,
        });

        if (prepared.file.size > UPLOAD_BUDGET_BYTES) {
          throw new Error(
            prepared.decoded
              ? "This photo is too large to upload, even after resizing. Please choose a smaller photo."
              : "This photo can't be resized in this browser and is too large to upload. Convert it to JPEG (HEIC photos especially) or choose a smaller photo."
          );
        }

        setUploadPhase("uploading");

        const formData = new FormData();
        formData.append("file", prepared.file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await parseJsonResponse<{ url?: string }>(
          response,
          "Upload failed"
        );

        if (data.url) {
          onChange(data.url);
        } else {
          throw new Error("The server did not return an image URL.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploadPhase(null);
      }
    },
    [onChange]
  );

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

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleUpload(e.dataTransfer.files[0]);
      }
    },
    [handleUpload]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Clear the input so removing an image and picking the very same file
      // again still fires a change event.
      e.target.value = "";
      if (file) {
        handleUpload(file);
      }
    },
    [handleUpload]
  );

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleRemove = useCallback(() => {
    onChange("");
  }, [onChange]);

  const handleGenerateAI = useCallback(async () => {
    if (!recipeContext?.title) return;

    setError(null);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate-recipe-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: recipeContext.title,
          description: recipeContext.description,
          ingredients: recipeContext.ingredients,
          instructions: recipeContext.instructions,
        }),
      });

      const data = await parseJsonResponse<{ url?: string }>(
        response,
        "Generation failed"
      );

      if (data.url) {
        onChange(data.url);
      } else {
        throw new Error("The server did not return an image URL.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  }, [recipeContext, onChange]);

  const canGenerateAI =
    recipeContext?.title && recipeContext.title.trim().length > 0;
  const isBusy = uploadPhase !== null || isGenerating;

  return (
    <div className="w-full">
      {value ? (
        <div className="relative aspect-video overflow-hidden rounded-xl border border-border">
          <Image
            src={value}
            alt="Recipe preview"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity hover:opacity-100 focus-within:opacity-100">
            {canGenerateAI && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleGenerateAI}
                disabled={isGenerating}
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {isGenerating ? "Generating..." : "Regenerate"}
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={openFilePicker}
              disabled={isGenerating}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Change
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={isGenerating}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div
          // The copy promises "Click to upload", so the whole dashed area now
          // opens the picker. It is marked presentational rather than given
          // role="button" because it contains real buttons, and nesting
          // interactive content inside a widget role is invalid; keyboard
          // users reach the same action through "Select Image" below, which is
          // focusable and activates the same handler.
          role="presentation"
          aria-busy={isBusy || undefined}
          onClick={isBusy ? undefined : openFilePicker}
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all ${
            isBusy ? "" : "cursor-pointer"
          } ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/50"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {isBusy ? (
            <div className="flex flex-col items-center gap-3">
              <Spinner size="lg" />
              <p className="text-sm text-muted-foreground">
                {isGenerating
                  ? "Generating image with AI..."
                  : uploadPhase === "preparing"
                    ? "Preparing photo..."
                    : "Uploading..."}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <ImagePlus className="h-7 w-7 text-primary" aria-hidden="true" />
              </div>
              <p className="mb-1 text-sm text-foreground">
                <span className="font-medium">Click to upload</span> or drag and
                drop
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WebP, GIF or HEIC (large photos are resized
                automatically)
              </p>
              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    // The whole dropzone is clickable; don't let the click
                    // bubble and open the picker twice.
                    e.stopPropagation();
                    openFilePicker();
                  }}
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Select Image
                </Button>
                {canGenerateAI && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerateAI();
                    }}
                    className="gap-1"
                  >
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Generate with AI
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.HEIC,.heif,.HEIF"
        onChange={handleChange}
        className="hidden"
        tabIndex={-1}
      />

      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
