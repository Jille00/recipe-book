"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { nanoid } from "nanoid";
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
  FileText,
  ImageOff,
} from "lucide-react";
import type { ExtractedRecipe, ExtractionResponse } from "@/types/extraction";
import { isHeicFile } from "@/lib/image/decode-heic";
import {
  compressImage,
  fitsRequestBudget,
  perImageBudget,
} from "@/lib/image/compress-image";
import {
  IMPORT_IMAGE_TYPES,
  IMPORT_PASSTHROUGH_TYPES,
  IMPORT_REQUEST_BUDGET_BYTES,
  MAX_IMPORT_FILES,
  parseJsonResponse,
  validateImageFile,
} from "./file-validation";

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface RecipeImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: ExtractedRecipe) => void;
  tags: Tag[];
}

type ModalState = "idle" | "preparing" | "extracting" | "preview" | "error";
type ImportMethod = "photo" | "url";

interface SelectedFile {
  /** Stable identity so removing a tile does not re-key every later tile. */
  id: string;
  file: File;
  /** Null until a HEIC photo has been converted into something displayable. */
  previewUrl: string | null;
  /**
   * HEIC photos start "converting": most desktop browsers can't display or
   * resize HEIC, so they are turned into a JPEG first. "unreadable" means that
   * conversion failed and there is nothing to preview.
   */
  status: "ready" | "converting" | "unreadable";
}

export function RecipeImportModal({
  open,
  onOpenChange,
  onImport,
  tags,
}: RecipeImportModalProps) {
  const [state, setState] = useState<ModalState>("idle");
  const [importMethod, setImportMethod] = useState<ImportMethod>("photo");
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [textInput, setTextInput] = useState("");
  const [extractedData, setExtractedData] = useState<ExtractedRecipe | null>(
    null
  );
  const [confidence, setConfidence] = useState<"high" | "medium" | "low" | null>(
    null
  );
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const isConvertingPhotos = selectedFiles.some((f) => f.status === "converting");
  const inputRef = useRef<HTMLInputElement>(null);
  // Guards against a second click landing before `state` flips to "extracting"
  // and firing another (paid) extraction call.
  const extractingRef = useRef(false);
  // Bumped whenever the modal resets, so photo compression that finishes after
  // the dialog was closed does not go on to start a (paid) extraction.
  const runIdRef = useRef(0);

  const selectedFilesRef = useRef<SelectedFile[]>([]);
  useEffect(() => {
    selectedFilesRef.current = selectedFiles;
  }, [selectedFiles]);

  // Every preview URL this component creates is tracked here, so all of them
  // are released on reset and unmount - including one whose photo was removed
  // while it was still converting.
  const previewUrlsRef = useRef(new Set<string>());
  const createPreviewUrl = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    previewUrlsRef.current.add(url);
    return url;
  }, []);
  const releasePreviewUrl = useCallback((url: string | null) => {
    if (url && previewUrlsRef.current.delete(url)) URL.revokeObjectURL(url);
  }, []);
  const releaseAllPreviewUrls = useCallback(() => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current.clear();
  }, []);
  useEffect(() => releaseAllPreviewUrls, [releaseAllPreviewUrls]);

  // HEIC conversions run one after another: each decoded 12MP photo needs
  // about 48MB, so converting a batch in parallel could exhaust memory.
  const conversionQueueRef = useRef<Promise<void>>(Promise.resolve());

  const resetState = useCallback(() => {
    runIdRef.current++;
    setState("idle");
    releaseAllPreviewUrls();
    setSelectedFiles([]);
    setTextInput("");
    setExtractedData(null);
    setConfidence(null);
    setWarnings([]);
    setError(null);
  }, [releaseAllPreviewUrls]);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        resetState();
      }
      onOpenChange(isOpen);
    },
    [onOpenChange, resetState]
  );

  // Enforces the image count and the accepted formats. Large photos are fine:
  // they are shrunk before upload (see handleExtract). Drag-and-drop never sees the input's `accept` filter, so
  // this has to run for both the picker and the dropzone - otherwise a dropped
  // PDF got an object URL that next/image could not render.
  const handleFilesSelect = useCallback(
    (files: FileList | File[]) => {
      const errors: string[] = [];
      const accepted: SelectedFile[] = [];
      let remainingSlots = MAX_IMPORT_FILES - selectedFiles.length;

      for (const file of Array.from(files)) {
        if (remainingSlots <= 0) {
          errors.push(`You can add at most ${MAX_IMPORT_FILES} images.`);
          break;
        }

        const validationError = validateImageFile(file, IMPORT_IMAGE_TYPES);
        if (validationError) {
          errors.push(validationError);
          continue;
        }

        const needsConversion = isHeicFile(file);
        accepted.push({
          id: nanoid(),
          file,
          previewUrl: needsConversion ? null : createPreviewUrl(file),
          status: needsConversion ? "converting" : "ready",
        });
        remainingSlots--;
      }

      if (accepted.length > 0) {
        setSelectedFiles((prev) => [...prev, ...accepted]);
      }
      setError(errors.length > 0 ? errors.join(" ") : null);

      const runId = runIdRef.current;
      for (const tile of accepted) {
        if (tile.status !== "converting") continue;
        conversionQueueRef.current = conversionQueueRef.current
          .then(() => convertHeicTile(tile, runId))
          .catch(() => undefined);
      }
    },
    // convertHeicTile is declared below and stable; it only reads refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedFiles.length, createPreviewUrl]
  );

  /**
   * Turns a HEIC photo into a JPEG so it can be previewed here and resized for
   * upload. Converting once, up front, means the extraction step later sees an
   * ordinary JPEG instead of decoding the HEIC a second time.
   */
  async function convertHeicTile(tile: SelectedFile, runId: number) {
    // Skip photos that were removed, or a dialog that was closed, while this
    // was waiting in the queue.
    const stillSelected = () =>
      runId === runIdRef.current &&
      selectedFilesRef.current.some((f) => f.id === tile.id);
    if (!stillSelected()) return;

    const result = await compressImage(tile.file, {
      maxBytes: IMPORT_REQUEST_BUDGET_BYTES,
      keepTypes: IMPORT_PASSTHROUGH_TYPES,
    });
    if (!stillSelected()) return;

    const previewUrl = result.decoded ? createPreviewUrl(result.file) : null;
    setSelectedFiles((prev) =>
      prev.map((f) =>
        f.id !== tile.id
          ? f
          : result.decoded
            ? { ...f, file: result.file, previewUrl, status: "ready" }
            : { ...f, status: "unreadable" }
      )
    );
  }

  const removeFile = useCallback(
    (id: string) => {
      const removed = selectedFilesRef.current.find((f) => f.id === id);
      releasePreviewUrl(removed?.previewUrl ?? null);
      setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
    },
    [releasePreviewUrl]
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
    // `state` only flips on the next render, so a double-click would otherwise
    // fire two extraction calls. The ref closes that window synchronously.
    // Photos still converting from HEIC aren't ready to upload yet.
    if (extractingRef.current || selectedFiles.length === 0 || isConvertingPhotos) {
      return;
    }
    extractingRef.current = true;
    const runId = runIdRef.current;

    setError(null);
    setState("preparing");

    // Vercel rejects request bodies over ~4.5MB before our route runs, so
    // shrink every photo to a share of one whole-request budget first.
    let prepared: Awaited<ReturnType<typeof compressImage>>[];
    try {
      const budget = perImageBudget(
        IMPORT_REQUEST_BUDGET_BYTES,
        selectedFiles.length
      );
      prepared = [];
      // One at a time: decoding several 12MP photos at once can exhaust
      // memory on phones.
      for (const sf of selectedFiles) {
        prepared.push(
          await compressImage(sf.file, {
            maxBytes: budget,
            keepTypes: IMPORT_PASSTHROUGH_TYPES,
          })
        );
      }
    } catch {
      extractingRef.current = false;
      if (runId !== runIdRef.current) return;
      setError("We couldn't prepare these photos. Please try different photos.");
      setState("idle");
      return;
    }

    if (runId !== runIdRef.current) {
      extractingRef.current = false;
      return;
    }

    if (
      !fitsRequestBudget(
        prepared.map((p) => p.file.size),
        IMPORT_REQUEST_BUDGET_BYTES
      )
    ) {
      extractingRef.current = false;
      const undecodable = prepared.some((p) => !p.decoded);
      // Keep the selection so the user can remove photos and retry.
      setError(
        undecodable
          ? "Some of these photos couldn't be read, so they can't be resized and are too large to upload together. Remove them and try again."
          : "These photos are too large to upload together, even after resizing. Remove a few photos and try again."
      );
      setState("idle");
      return;
    }

    setState("extracting");

    try {
      const formData = new FormData();
      prepared.forEach((p) => {
        formData.append("files", p.file);
      });

      const response = await fetch("/api/extract-recipe", {
        method: "POST",
        body: formData,
      });

      const extractionData = await parseJsonResponse<ExtractionResponse>(
        response,
        "Extraction failed"
      );

      setExtractedData(extractionData.recipe);
      setConfidence(extractionData.confidence);
      setWarnings(extractionData.warnings || []);
      setState("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract recipe");
      setState("error");
    } finally {
      extractingRef.current = false;
    }
  };

  const handleTextExtract = async () => {
    if (extractingRef.current || !textInput.trim()) return;
    extractingRef.current = true;

    setError(null);
    setState("extracting");

    try {
      const response = await fetch("/api/import-recipe-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textInput.trim() }),
      });

      const extractionData = await parseJsonResponse<ExtractionResponse>(
        response,
        "Extraction failed"
      );

      setExtractedData(extractionData.recipe);
      setConfidence(extractionData.confidence);
      setWarnings(extractionData.warnings || []);
      setState("preview");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to extract recipe from text"
      );
      setState("error");
    } finally {
      extractingRef.current = false;
    }
  };

  const handleApply = () => {
    if (extractedData) {
      onImport(extractedData);
      handleOpenChange(false);
    }
  };

  const matchTag = (suggestedCategory: string | undefined): string => {
    if (!suggestedCategory) return "";
    const normalized = suggestedCategory.toLowerCase().trim();
    const exact = tags.find((t) => t.name.toLowerCase() === normalized);
    if (exact) return exact.name;
    const partial = tags.find(
      (t) =>
        t.name.toLowerCase().includes(normalized) ||
        normalized.includes(t.name.toLowerCase())
    );
    if (partial) return partial.name;
    return suggestedCategory;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {importMethod === "photo" ? (
              <Camera className="h-5 w-5" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
            Import Recipe
          </DialogTitle>
          <DialogDescription>
            {importMethod === "photo"
              ? "Upload a photo of a recipe (cookbook page, handwritten card, or screenshot) and we'll extract the details automatically."
              : "Paste recipe text from a website or document and we'll extract the details automatically."}
          </DialogDescription>
        </DialogHeader>

        {/* Tab Switcher - only show in idle state */}
        {state === "idle" && (
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            <button
              type="button"
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                importMethod === "photo"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setImportMethod("photo")}
            >
              <Camera className="h-4 w-4" />
              From Photos
            </button>
            <button
              type="button"
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                importMethod === "url"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setImportMethod("url")}
            >
              <FileText className="h-4 w-4" />
              From Text
            </button>
          </div>
        )}

        {state === "idle" && importMethod === "photo" && (
          <div className="space-y-4">
            {/* Dropzone */}
            <div
              className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              } cursor-pointer`}
              role="presentation"
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Camera className="h-6 w-6 text-primary" />
              </div>
              <p className="mb-1 text-sm text-foreground">
                <span className="font-medium">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WebP, or HEIC (up to {MAX_IMPORT_FILES} images; large
                photos are resized automatically)
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
              >
                <Upload className="h-4 w-4" />
                Select Images
              </Button>
            </div>

            {/* Validation feedback (wrong format, too many, too large to upload) */}
            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}

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
                      // Photos still converting check they're selected before
                      // finishing, so clearing the list is enough to drop them.
                      releaseAllPreviewUrls();
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
                      key={sf.id}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
                    >
                      {sf.status === "ready" && sf.previewUrl ? (
                        <Image
                          src={sf.previewUrl}
                          alt={`Image ${index + 1}`}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      ) : sf.status === "converting" ? (
                        <div
                          role="status"
                          className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground"
                        >
                          <Spinner size="sm" />
                          <span className="text-xs">Converting</span>
                          <span className="sr-only">
                            Converting image {index + 1} so it can be previewed
                          </span>
                        </div>
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-2 text-center text-muted-foreground">
                          <ImageOff className="h-5 w-5" aria-hidden="true" />
                          <span className="text-xs">Can&apos;t preview</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(sf.id)}
                        aria-label={`Remove image ${index + 1}`}
                        // Always visible where there is no hover (touch, small
                        // screens); revealed on hover or keyboard focus above.
                        className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition-opacity hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                      <span className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white">
                        {index + 1}
                      </span>
                    </div>
                  ))}
                  {selectedFiles.length < MAX_IMPORT_FILES && (
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      aria-label="Add more images"
                      className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
                    >
                      <Plus className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={handleExtract}
                  disabled={
                    state !== "idle" ||
                    selectedFiles.length === 0 ||
                    isConvertingPhotos
                  }
                  className="w-full"
                >
                  {isConvertingPhotos ? (
                    <>
                      <Spinner size="sm" />
                      Converting photos…
                    </>
                  ) : (
                    <>
                      <ChefHat className="h-4 w-4" aria-hidden="true" />
                      Extract Recipe from {selectedFiles.length} Image
                      {selectedFiles.length !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.HEIC,.heif,.HEIF"
              onChange={handleChange}
              multiple
              className="hidden"
            />
          </div>
        )}

        {state === "idle" && importMethod === "url" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="recipe-text" className="text-sm font-medium">
                Recipe Text
              </label>
              <textarea
                id="recipe-text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Paste recipe text here... (ingredients, instructions, etc.)"
                rows={8}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Copy and paste recipe content from a website or document
              </p>
            </div>

            <Button
              type="button"
              onClick={handleTextExtract}
              disabled={state !== "idle" || !textInput.trim()}
              className="w-full"
            >
              <ChefHat className="h-4 w-4" />
              Extract Recipe from Text
            </Button>
          </div>
        )}

        {(state === "preparing" || state === "extracting") && (
          <div
            className="flex flex-col items-center justify-center py-12"
            aria-live="polite"
          >
            <Spinner size="lg" />
            <p className="mt-4 text-sm text-muted-foreground">
              {state === "preparing"
                ? `Preparing ${selectedFiles.length === 1 ? "photo" : "photos"} for upload...`
                : importMethod === "photo"
                  ? "Extracting recipe from image..."
                  : "Extracting recipe from text..."}
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
                    {matchTag(extractedData.suggestedCategory)}
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
                {importMethod === "photo" ? "Try Different Image" : "Try Different Text"}
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
