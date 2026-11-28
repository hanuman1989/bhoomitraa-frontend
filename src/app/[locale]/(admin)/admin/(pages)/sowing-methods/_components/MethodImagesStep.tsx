"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslations } from "next-intl";
import ComponentCard from "@/components/admin/common/ComponentCard";
import ImagePreview from "@/components/common/ImagePreview";
import Tooltip from "@/components/common/Tooltip";
import {
  ArrowRightIcon,
  ChevronLeftIcon,
  CloseLineIcon,
  CloudUploadIcon,
  ResizeGripIcon,
} from "@/icons";
import type { MethodGalleryItem } from "@/types/admin/sowingMethod";
import SeedConfirmDialog from "../../seeds/_components/SeedConfirmDialog";

function GalleryPreview({
  item,
  alt,
}: {
  item: MethodGalleryItem;
  alt: string;
}) {
  const file = "file" in item ? item.file : null;
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const frame = requestAnimationFrame(() => setPreview(url));
    return () => {
      cancelAnimationFrame(frame);
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return (
    <ImagePreview
      src={"image" in item ? item.image.image_url : preview}
      alt={alt}
      fill
      sizes="(min-width: 1280px) 240px, (min-width: 640px) 33vw, 50vw"
      className="object-cover"
      draggable={false}
    />
  );
}

export default function MethodImagesStep({
  gallery,
  setGallery,
  title,
  busy,
  errors,
}: {
  gallery: MethodGalleryItem[];
  setGallery: (items: MethodGalleryItem[]) => void;
  title: string;
  busy: boolean;
  errors: string[];
}) {
  const t = useTranslations("sowingMethods");
  const galleryErrorId = useId();
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<Extract<
    MethodGalleryItem,
    { image: unknown }
  > | null>(null);
  const dragging = useRef<MethodGalleryItem["token"] | null>(null);
  const messages = [...new Set([error, ...errors].filter(Boolean))];

  function move(token: MethodGalleryItem["token"], to: number) {
    const from = gallery.findIndex((item) => item.token === token);
    if (busy || from === -1 || to < 0 || to >= gallery.length || from === to)
      return;
    const next = [...gallery];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setGallery(next);
    setError("");
  }

  function remove(item: MethodGalleryItem) {
    if (busy) return;
    setGallery(gallery.filter((value) => value.token !== item.token));
    setRemoving(null);
    setError("");
  }

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    disabled: busy,
    multiple: true,
    noClick: true,
    noKeyboard: true,
    maxSize: 5 * 1024 * 1024,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    onDrop: (files, rejected) => {
      if (busy) return;
      if (
        rejected.length ||
        files.some(
          (file) =>
            !file.size ||
            !/\.(?:jpe?g|png|webp)$/i.test(file.name) ||
            !["image/jpeg", "image/png", "image/webp"].includes(file.type),
        )
      ) {
        setError(t("invalidImage"));
        return;
      }
      if (gallery.length + files.length > 8) {
        setError(t("imageCount"));
        return;
      }
      setGallery([
        ...gallery,
        ...files.map((file): MethodGalleryItem => ({
          token: `new:${crypto.getRandomValues(new Uint32Array(4)).join("-")}`,
          file,
        })),
      ]);
      setError("");
    },
  });

  return (
    <ComponentCard
      title={t("step3")}
      desc={t("imagesHelp")}
      className="shadow-theme-xs"
    >
      <div className="grid items-start gap-5 xl:grid-cols-3">
        <div className="min-w-0 space-y-4 xl:col-span-2">
          <div {...getRootProps({ role: "presentation" })}>
            <input {...getInputProps({ disabled: busy })} />
            <button
              type="button"
              onClick={open}
              disabled={busy}
              aria-describedby={messages.length ? galleryErrorId : undefined}
              className={`text-brand-600 focus-visible:outline-brand-500 dark:text-brand-300 flex min-h-36 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-5 text-center font-medium focus-visible:outline-2 disabled:cursor-default disabled:opacity-50 ${isDragActive ? "border-brand-500 bg-brand-100 dark:bg-brand-500/20" : "border-brand-300 bg-brand-25 dark:border-brand-800 dark:bg-brand-500/5"}`}
            >
              <CloudUploadIcon aria-hidden="true" className="size-10" />
              {t("uploadImages")}
            </button>
          </div>
          {messages.length > 0 && (
            <ul
              id={galleryErrorId}
              role="alert"
              className="text-error-600 dark:text-error-400 space-y-1 text-sm"
            >
              {messages.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
          {gallery.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("noImages")}
            </p>
          ) : (
            <ol
              aria-label={t("step3")}
              className="grid grid-cols-2 gap-3 sm:grid-cols-3"
            >
              {gallery.map((item, index) => {
                const position = index + 1;
                const removeLabel = t("removeImage", { position });
                return (
                  <li
                    key={item.token}
                    onDragOver={(event) => {
                      if (!busy && dragging.current) event.preventDefault();
                    }}
                    onDrop={(event) => {
                      if (busy || !dragging.current) return;
                      event.preventDefault();
                      move(dragging.current, index);
                      dragging.current = null;
                    }}
                    className="min-w-0 rounded-xl border border-gray-200 p-1.5 dark:border-gray-700"
                  >
                    <div className="relative aspect-4/3">
                      <div className="absolute inset-0 overflow-hidden rounded-lg">
                        <GalleryPreview
                          item={item}
                          alt={t("imageAlt", { title, position })}
                        />
                      </div>
                      <span
                        aria-hidden="true"
                        draggable={!busy}
                        onDragStart={(event) => {
                          dragging.current = item.token;
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", item.token);
                        }}
                        onDragEnd={() => {
                          dragging.current = null;
                        }}
                        className="absolute start-2 top-2 cursor-grab rounded-lg bg-white p-1.5 text-gray-700 active:cursor-grabbing dark:bg-gray-800 dark:text-gray-200"
                      >
                        <ResizeGripIcon aria-hidden="true" className="size-4" />
                      </span>
                      <Tooltip
                        content={removeLabel}
                        className="absolute end-2 top-2"
                      >
                        <button
                          type="button"
                          disabled={busy}
                          aria-label={removeLabel}
                          onClick={() =>
                            "image" in item ? setRemoving(item) : remove(item)
                          }
                          className="shadow-theme-xs focus-visible:outline-brand-500 inline-flex size-7 items-center justify-center rounded-full bg-white text-gray-800 focus-visible:outline-2 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-100"
                        >
                          <CloseLineIcon
                            aria-hidden="true"
                            className="size-4"
                          />
                        </button>
                      </Tooltip>
                      <div className="absolute start-2 bottom-2 flex items-center gap-1.5 text-xs font-semibold">
                        <span className="rounded-full bg-white px-2 py-1 text-gray-800">
                          {position}
                        </span>
                        {index === 0 && (
                          <span className="bg-brand-500 rounded-full px-2 py-1 text-white">
                            {t("primary")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between px-1 py-1">
                      <button
                        type="button"
                        disabled={busy || index === 0}
                        aria-label={t("moveEarlier", { position })}
                        onClick={() => move(item.token, index - 1)}
                        className="text-brand-600 focus-visible:outline-brand-500 dark:text-brand-300 inline-flex size-7 items-center justify-center rounded focus-visible:outline-2 disabled:opacity-30"
                      >
                        <ChevronLeftIcon
                          aria-hidden="true"
                          className="size-4 rtl:rotate-180"
                        />
                      </button>
                      <button
                        type="button"
                        disabled={busy || index === gallery.length - 1}
                        aria-label={t("moveLater", { position })}
                        onClick={() => move(item.token, index + 1)}
                        className="text-brand-600 focus-visible:outline-brand-500 dark:text-brand-300 inline-flex size-7 items-center justify-center rounded focus-visible:outline-2 disabled:opacity-30"
                      >
                        <ArrowRightIcon
                          aria-hidden="true"
                          className="size-4 rtl:rotate-180"
                        />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
        <aside className="bg-brand-25 dark:bg-brand-500/5 border-brand-100 dark:border-brand-500/20 rounded-xl border p-4">
          <h4 className="mb-3 font-semibold text-gray-900 dark:text-white">
            {t("imageGuidelines")}
          </h4>
          <ul className="list-disc space-y-2 ps-5 text-sm text-gray-700 dark:text-gray-300">
            <li>{t("primaryHelp")}</li>
            <li>{t("reorderHelp")}</li>
            <li>{t("imageLimits")}</li>
            <li>{t("removalHelp")}</li>
          </ul>
        </aside>
      </div>
      {removing && (
        <SeedConfirmDialog
          title={t("removeTitle")}
          description={t("removeDescription")}
          confirmLabel={t("remove")}
          busy={busy}
          destructive
          onClose={() => setRemoving(null)}
          onConfirm={() => remove(removing)}
        />
      )}
    </ComponentCard>
  );
}
