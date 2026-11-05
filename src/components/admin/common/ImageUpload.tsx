"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { UseFormRegisterReturn } from "react-hook-form";
import ImagePreview from "@/components/common/ImagePreview";
import { CloudUploadIcon, TrashBinIcon } from "@/icons";

interface ImageUploadProps {
  id: string;
  label: string;
  existingImageUrl?: string | null;
  selectedFile: File | null;
  onChange: (files: File[]) => boolean;
  inputProps: UseFormRegisterReturn;
  error?: string;
  disabled?: boolean;
  maxSizeMB?: number;
  removalPending?: boolean;
  onRemoveExisting?: () => void;
  onUndoRemove?: () => void;
}

export default function ImageUpload({
  id,
  label,
  existingImageUrl,
  selectedFile,
  onChange,
  inputProps,
  error,
  disabled = false,
  maxSizeMB = 5,
  removalPending = false,
  onRemoveExisting,
  onUndoRemove,
}: ImageUploadProps) {
  const t = useTranslations("ui.imageUpload");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const filesRef = useRef<File[]>(selectedFile ? [selectedFile] : []);
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(
    null,
  );
  const [previewError, setPreviewError] = useState("");

  // Data URLs survive Activity hide/show; readers are cancelled on cleanup.
  useEffect(() => {
    if (!selectedFile) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string")
        setPreview({ file: selectedFile, url: reader.result });
    };
    reader.onerror = () => setPreviewError(t("previewFailed"));
    reader.readAsDataURL(selectedFile);
    return () => {
      reader.onload = null;
      reader.onerror = null;
      if (reader.readyState === FileReader.LOADING) reader.abort();
    };
  }, [selectedFile, t]);

  function chooseFiles(files: File[]) {
    if (disabled) return;
    filesRef.current = files;
    setPreviewError("");
    onChange(files);
    // Allow selecting the same file again after a rejected selection.
    if (inputRef.current) inputRef.current.value = "";
  }

  const currentImage = selectedFile
    ? preview?.file === selectedFile
      ? preview.url
      : null
    : removalPending
      ? null
      : existingImageUrl;
  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          chooseFiles(Array.from(event.dataTransfer.files));
        }}
        className={`focus-within:ring-brand-500/20 border-brand-200 bg-brand-25/50 dark:border-brand-800 relative flex min-h-60 w-full flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition-colors focus-within:ring-3 dark:bg-gray-800/40 ${disabled ? "opacity-60" : "hover:border-brand-300 hover:bg-brand-25 dark:hover:border-brand-600 dark:hover:bg-gray-800/60"}`}
      >
        {currentImage ? (
          <ImagePreview
            src={currentImage}
            alt={label}
            width={400}
            height={260}
            className="mb-4 max-h-48 w-full rounded-lg object-contain"
          />
        ) : selectedFile ? (
          <p
            role="status"
            className="mb-4 text-sm text-gray-500 dark:text-gray-400"
          >
            {t("previewLoading")}
          </p>
        ) : (
          <CloudUploadIcon
            aria-hidden="true"
            className="text-brand-900/65 dark:text-brand-200/75 mb-5 size-12"
          />
        )}
        <label
          htmlFor={id}
          className="text-sm font-medium text-gray-900 dark:text-gray-100"
        >
          <span className="sr-only">{label}: </span>
          {selectedFile || (existingImageUrl && !removalPending)
            ? t("replace")
            : t("clickToUpload")}
          <span className="text-brand-900/65 dark:text-brand-200/75 font-normal">
            {" "}
            {t("orDragAndDrop")}
          </span>
        </label>
        <p
          id={`${id}-hint`}
          className="text-brand-900/65 dark:text-brand-200/75 mt-2 text-xs leading-5"
        >
          {t("allowed", { size: maxSizeMB })}
        </p>
        <input
          {...inputProps}
          ref={(element) => {
            inputRef.current = element;
            inputProps.ref(element);
          }}
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          onChange={(event) =>
            chooseFiles(Array.from(event.target.files ?? []))
          }
          onBlur={() => {
            void inputProps.onBlur({
              type: "blur",
              target: { name: inputProps.name, value: filesRef.current },
            });
          }}
          aria-required="false"
          aria-invalid={!!error}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
          className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
      </div>
      {selectedFile && (
        <>
          <p className="text-sm break-all text-gray-700 dark:text-gray-300">
            {selectedFile.name}
            <span className="mt-1 block text-xs text-gray-500">
              {t("size", {
                size: (selectedFile.size / 1024 / 1024).toFixed(2),
              })}
            </span>
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={() => chooseFiles([])}
            className="text-error-600 focus-visible:outline-error-500 dark:text-error-400 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm focus-visible:outline-2 disabled:opacity-50"
          >
            <TrashBinIcon aria-hidden="true" className="size-4" />
            {t("discardSelected")}
          </button>
        </>
      )}
      {!selectedFile &&
        existingImageUrl &&
        !removalPending &&
        onRemoveExisting && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled) onRemoveExisting();
            }}
            className="text-error-600 focus-visible:outline-error-500 dark:text-error-400 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm focus-visible:outline-2 disabled:opacity-50"
          >
            <TrashBinIcon aria-hidden="true" className="size-4" />
            {t("discardExisting")}
          </button>
        )}
      {removalPending && !selectedFile && (
        <div className="space-y-2">
          <p role="status" className="text-sm text-gray-600 dark:text-gray-400">
            {t("removalPending")}
          </p>
          {onUndoRemove && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                if (!disabled) onUndoRemove();
              }}
              className="text-brand-600 focus-visible:outline-brand-500 dark:text-brand-400 rounded-lg px-2 py-1 text-sm focus-visible:outline-2 disabled:opacity-50"
            >
              {t("undoRemoval")}
            </button>
          )}
        </div>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-error-600 dark:text-error-400 text-sm"
        >
          {error}
        </p>
      )}
      {previewError && (
        <p role="alert" className="text-error-600 dark:text-error-400 text-sm">
          {previewError}
        </p>
      )}
    </div>
  );
}
