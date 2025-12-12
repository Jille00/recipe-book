"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { Button, Spinner } from "@/components/ui";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);
      setIsUploading(true);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Upload failed");
        }

        if (data.url) {
          onChange(data.url);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setIsUploading(false);
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
      if (e.target.files && e.target.files[0]) {
        handleUpload(e.target.files[0]);
      }
    },
    [handleUpload]
  );

  const handleRemove = useCallback(() => {
    onChange("");
  }, [onChange]);

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
        Recipe Image
      </label>

      {value ? (
        <div className="relative aspect-video overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
          <Image
            src={value}
            alt="Recipe preview"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity hover:opacity-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              Change
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleRemove}
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            dragActive
              ? "border-orange-500 bg-orange-50 dark:bg-orange-900/10"
              : "border-neutral-300 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-600"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Spinner size="lg" />
              <p className="text-sm text-neutral-500">Uploading...</p>
            </div>
          ) : (
            <>
              <div className="mb-4 text-4xl">📷</div>
              <p className="mb-2 text-sm text-neutral-600 dark:text-neutral-400">
                <span className="font-medium">Click to upload</span> or drag and
                drop
              </p>
              <p className="text-xs text-neutral-500">
                PNG, JPG, WebP or GIF (max. 5MB)
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => inputRef.current?.click()}
              >
                Select Image
              </Button>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleChange}
        className="hidden"
      />

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
