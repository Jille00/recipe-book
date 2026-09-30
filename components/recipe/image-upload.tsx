"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button, Spinner } from "@/components/ui";
import { AlertCircle, Upload, X, RefreshCw, Sparkles } from "lucide-react";
import { DelftWall } from "@/components/delft/delft-tile";
import { cn } from "@/lib/utils";
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
  /**
   * Seed (and tags) of the recipe's tile, shown behind the upload prompt as a
   * preview of the cover the recipe gets without a photo.
   */
  tileSeed?: string;
  tileTags?: readonly string[];
}

export function ImageUpload({
  value,
  onChange,
  recipeContext,
  tileSeed,
  tileTags,
}: ImageUploadProps) {
  // "preparing" = shrinking the photo in the browser, "uploading" = POSTing it.
  const [uploadPhase, setUploadPhase] = useState<
    "preparing" | "uploading" | null
  >(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // The "Photo removed" toast, dismissed once a new photo replaces the
  // removed one so its Undo cannot swap the new photo back out.
  const undoToastRef = useRef<string | number | null>(null);

  const setPhoto = useCallback(
    (url: string) => {
      if (undoToastRef.current !== null) {
        toast.dismiss(undoToastRef.current);
        undoToastRef.current = null;
      }
      onChange(url);
    },
    [onChange]
  );

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
              : "This photo couldn't be read, so it can't be resized and is too large to upload. Try a different photo."
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
          setPhoto(data.url);
        } else {
          throw new Error("The server did not return an image URL.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploadPhase(null);
      }
    },
    [setPhoto]
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

  // A removed AI image cannot be generated again identically (and costs a new
  // generation), so removal can be undone for a while.
  const handleRemove = useCallback(() => {
    const removed = value;
    onChange("");
    if (!removed) return;
    undoToastRef.current = toast("Photo removed", {
      action: {
        label: "Undo",
        onClick: () => {
          undoToastRef.current = null;
          onChange(removed);
        },
      },
      onDismiss: () => {
        undoToastRef.current = null;
      },
      onAutoClose: () => {
        undoToastRef.current = null;
      },
    });
  }, [value, onChange]);

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
        setPhoto(data.url);
      } else {
        throw new Error("The server did not return an image URL.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  }, [recipeContext, setPhoto]);

  const canGenerateAI =
    recipeContext?.title && recipeContext.title.trim().length > 0;
  const isBusy = uploadPhase !== null || isGenerating;
  const statusMessage = isGenerating
    ? "Generating image with AI..."
    : uploadPhase === "preparing"
      ? "Preparing photo..."
      : uploadPhase === "uploading"
        ? "Uploading..."
        : "";

  const photoActions = (
    <>
      {canGenerateAI && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGenerateAI}
          disabled={isGenerating}
        >
          <Sparkles aria-hidden="true" />
          {isGenerating ? "Generating..." : "Regenerate"}
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={openFilePicker}
        disabled={isGenerating}
      >
        <RefreshCw aria-hidden="true" />
        Change
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleRemove}
        disabled={isGenerating}
        className="hover:text-destructive"
      >
        <X aria-hidden="true" />
        Remove
      </Button>
    </>
  );

  return (
    <div className="w-full">
      {value ? (
        <>
          <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-muted">
            <Image
              src={value}
              alt="Recipe preview"
              fill
              sizes="(min-width: 896px) 832px, 100vw"
              className="object-cover"
            />
            {/* On hover-capable screens >= sm the actions sit over the photo
                and appear on hover or focus. Touch screens have no hover, so
                there they stay visible. */}
            <div className="absolute inset-0 hidden items-center justify-center gap-2 bg-ink/55 opacity-0 transition-opacity duration-(--duration-fast) ease-out hover:opacity-100 focus-within:opacity-100 sm:flex [@media(hover:none)]:opacity-100">
              {photoActions}
            </div>
          </div>
          {/* Below sm the actions sit under the photo, always visible. */}
          <div className="mt-3 flex flex-wrap gap-2 sm:hidden">{photoActions}</div>
        </>
      ) : (
        <div
          // The copy promises "Choose a photo", so the whole area opens the
          // picker. It is marked presentational rather than given
          // role="button" because it contains real buttons, and nesting
          // interactive content inside a widget role is invalid; keyboard
          // users reach the same action through "Upload photo" below, which
          // is focusable and activates the same handler.
          role="presentation"
          aria-busy={isBusy || undefined}
          onClick={isBusy ? undefined : openFilePicker}
          className={cn(
            "relative flex min-h-72 items-center justify-center overflow-hidden rounded-xl border-[1.5px] border-dashed p-4 transition-colors duration-(--duration-fast) ease-out sm:aspect-[2/1] sm:min-h-0 sm:p-6",
            !isBusy && "cursor-pointer",
            dragActive
              ? "border-primary ring-[3px] ring-primary/15"
              : "border-input hover:border-primary"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {/* The recipe's own tile, as it will look without a photo. */}
          {tileSeed && (
            <DelftWall
              seed={tileSeed}
              tags={tileTags}
              tileSize={112}
              className="absolute inset-0"
            />
          )}

          <div className="relative flex w-full max-w-sm flex-col items-center rounded-lg border border-border bg-card/95 px-5 py-5 text-center shadow-medium backdrop-blur-sm">
            {isBusy ? (
              <div className="flex flex-col items-center gap-3 py-2">
                <Spinner size="lg" className="text-primary" />
                <p className="text-sm text-muted-foreground" aria-hidden="true">
                  {statusMessage}
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">
                  Choose a photo or drag it here
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  PNG, JPG, WebP, GIF or HEIC. Large photos are resized
                  automatically.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      // The whole area is clickable; don't let the click
                      // bubble and open the picker twice.
                      e.stopPropagation();
                      openFilePicker();
                    }}
                  >
                    <Upload aria-hidden="true" />
                    Upload photo
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
                    >
                      <Sparkles aria-hidden="true" />
                      Generate with AI
                    </Button>
                  )}
                </div>
                {!canGenerateAI && (
                  <p className="mt-3 text-[13px] text-muted-foreground">
                    Add a title to generate a photo with AI.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Always rendered, so screen readers announce each status change. */}
      <p role="status" className="sr-only">
        {statusMessage}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.HEIC,.heif,.HEIF"
        onChange={handleChange}
        className="hidden"
        tabIndex={-1}
      />

      {error && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 text-[13px] text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
