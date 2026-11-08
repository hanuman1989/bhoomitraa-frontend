"use client";

import { useEffect, useRef, useState } from "react";
import { Controller, useController, useForm, useWatch } from "react-hook-form";
import { useDropzone } from "react-dropzone";
import { useTranslations } from "next-intl";
import ComponentCard from "@/components/admin/common/ComponentCard";
import ImagePreview from "@/components/common/ImagePreview";
import FilterSelect from "@/components/admin/common/FilterSelect";
import Switch from "@/components/admin/form/switch/Switch";
import {
  CloudUploadIcon,
  CloseLineIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
  ListIcon,
} from "@/icons";
import { useModal } from "@/hooks/useModal";
import TimelineRelationSelect from "@/app/[locale]/(admin)/admin/(pages)/crop-stage-timelines/_components/TimelineRelationSelect";
import {
  seedVerificationStatuses,
  type Seed,
  type SeedGalleryItem,
  type SeedMediaValues,
  type SeedMediaPayload,
} from "@/types/admin/seed";
import type { ActionResult } from "@/types/api";
import type {
  TimelineChoices,
  TimelineSelections,
} from "@/types/admin/cropStageTimeline";
import SeedConfirmDialog from "./SeedConfirmDialog";

export default function Step3MediaSource({
  seed,
  choices,
  selections,
  canReview,
  busy,
  onDirty,
  onSave,
  namespace = "seeds",
  formId = "seed-step-3",
  requireSourceWhenVerified = true,
}: {
  seed: Pick<
    Seed,
    | "name"
    | "images"
    | "source_id"
    | "verification_status"
    | "requested_is_active"
  >;
  namespace?: "seeds" | "fertilizers";
  formId?: string;
  requireSourceWhenVerified?: boolean;
  choices: TimelineChoices;
  selections: TimelineSelections;
  canReview: boolean;
  busy: boolean;
  onDirty: (dirty: boolean) => void;
  onSave: (
    values: SeedMediaPayload,
    uploads: FormData,
  ) => Promise<ActionResult<unknown>>;
}) {
  const t = useTranslations(namespace);
  const urls = useRef(new Set<string>()),
    dragging = useRef<string | null>(null);
  const [removing, setRemoving] = useState<SeedGalleryItem | null>(null);
  const { isOpen, openModal, closeModal } = useModal();
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm<SeedMediaValues>({
    defaultValues: {
      source_id: seed.source_id ? String(seed.source_id) : "",
      verification_status: seed.verification_status,
      is_active: seed.requested_is_active,
      gallery: seed.images.map((image) => ({ token: `id:${image.id}`, image })),
    },
    mode: "onTouched",
  });
  const verification = useWatch({ control, name: "verification_status" });
  const { field: galleryField } = useController({
    name: "gallery",
    control,
    rules: {
      validate: (items) => items.length <= 8 || t("feedback.imageCount"),
    },
  });
  const gallery = galleryField.value;
  useEffect(() => onDirty(isDirty), [isDirty, onDirty]);
  useEffect(() => {
    const owned = urls.current;
    return () => {
      owned.forEach((url) => URL.revokeObjectURL(url));
      owned.clear();
    };
  }, []);
  function move(token: string, to: number) {
    if (busy) return;
    const items = [...getValues("gallery")],
      from = items.findIndex((item) => item.token === token);
    if (from < 0 || to < 0 || to >= items.length) return;
    const [item] = items.splice(from, 1);
    items.splice(to, 0, item);
    setValue("gallery", items, { shouldDirty: true, shouldValidate: true });
  }
  function remove(item: SeedGalleryItem) {
    if (busy) return;
    if ("file" in item) {
      URL.revokeObjectURL(item.preview);
      urls.current.delete(item.preview);
    }
    setValue(
      "gallery",
      getValues("gallery").filter((value) => value.token !== item.token),
      { shouldDirty: true, shouldValidate: true },
    );
  }
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    disabled: busy,
    multiple: true,
    maxFiles: 8,
    maxSize: 5 * 1024 * 1024,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    onDrop: (accepted, rejected) => {
      if (busy) return;
      if (
        rejected.length ||
        accepted.some(
          (file) =>
            !file.size ||
            !/\.(jpe?g|png|webp)$/i.test(file.name) ||
            !["image/jpeg", "image/png", "image/webp"].includes(file.type),
        )
      ) {
        setError("gallery", {
          type: "validate",
          message: t("feedback.invalidImage"),
        });
        return;
      }
      const previous = getValues("gallery");
      if (previous.length + accepted.length > 8) {
        setError("gallery", {
          type: "validate",
          message: t("feedback.imageCount"),
        });
        return;
      }
      const next: SeedGalleryItem[] = accepted.map((file) => {
        const preview = URL.createObjectURL(file);
        urls.current.add(preview);
        return { token: `new:${crypto.randomUUID()}`, file, preview };
      });
      clearErrors("gallery");
      setValue("gallery", [...previous, ...next], {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
  });
  async function submit(values: SeedMediaValues) {
    const uploads = new FormData();
    for (const item of values.gallery)
      if ("file" in item)
        uploads.append(`images[${item.token.slice(4)}]`, item.file);
    const retain = values.gallery.flatMap((item) =>
      "image" in item ? [item.image.id] : [],
    );
    const response = await onSave(
      {
        source_id: values.source_id ? Number(values.source_id) : null,
        verification_status: values.verification_status,
        is_active: values.is_active,
        retain_image_ids: retain,
        remove_image_ids: seed.images
          .filter((image) => !retain.includes(image.id))
          .map((image) => image.id),
        image_order: values.gallery.map((item) => item.token),
      },
      uploads,
    );
    for (const [key, messages] of Object.entries(response.errors ?? {})) {
      if (!messages[0]) continue;
      if (
        key === "source_id" ||
        key === "verification_status" ||
        key === "is_active"
      )
        setError(key, { type: "server", message: messages[0] });
      else if (
        /^(images|image_order|retain_image_ids|remove_image_ids|alt_texts)(\.|$)/.test(
          key,
        )
      )
        setError("gallery", { type: "server", message: messages[0] });
    }
  }
  return (
    <>
      <form
        id={formId}
        onSubmit={handleSubmit(submit)}
        noValidate
        aria-busy={busy}
      >
        <fieldset disabled={busy} className="space-y-5">
          <legend className="sr-only">{t("media.title")}</legend>
          <ComponentCard
            title={t("media.title")}
            desc={t("media.description")}
            className="shadow-theme-xs rounded-xl"
          >
            <div className="grid items-start gap-5 xl:grid-cols-4">
              <div className="space-y-4 xl:col-span-3">
                <div
                  {...getRootProps()}
                  role="button"
                  aria-label={t("media.browse")}
                  aria-describedby="seed-gallery-error"
                  aria-disabled={busy}
                  className={`text-brand-600 focus-visible:outline-brand-500 dark:text-brand-300 flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-6 text-center focus-visible:outline-2 ${isDragActive ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10" : "border-brand-300 bg-brand-25 dark:border-brand-800 dark:bg-brand-500/5"}`}
                >
                  <input {...getInputProps()} />
                  <CloudUploadIcon aria-hidden="true" className="size-9" />
                  <p className="text-sm">
                    {t(isDragActive ? "media.drop" : "media.browse")}
                  </p>
                </div>
                <p
                  id="seed-gallery-error"
                  role="alert"
                  className="text-error-600 dark:text-error-400 text-sm"
                >
                  {errors.gallery?.message}
                </p>
                <ol
                  aria-label={t("media.gallery")}
                  className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
                >
                  {gallery.map((item, index) => (
                    <li
                      key={item.token}
                      draggable={!busy}
                      onDragStart={(event) => {
                        dragging.current = item.token;
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", item.token);
                      }}
                      onDragEnd={() => {
                        dragging.current = null;
                      }}
                      onDragOver={(event) => {
                        if (dragging.current && !busy) event.preventDefault();
                      }}
                      onDrop={(event) => {
                        if (!dragging.current || busy) return;
                        event.preventDefault();
                        event.stopPropagation();
                        move(dragging.current, index);
                        dragging.current = null;
                      }}
                      className="relative min-w-0 rounded-xl border border-gray-200 p-1 dark:border-gray-700"
                    >
                      <div className="relative aspect-4/3 overflow-hidden rounded-lg">
                        <ImagePreview
                          src={
                            "image" in item
                              ? item.image.image_url
                              : item.preview
                          }
                          alt={
                            "image" in item
                              ? (item.image.alt_text ??
                                seed.name ??
                                t("media.imageAlt", { number: index + 1 }))
                              : item.file.name
                          }
                          fill
                          className="object-cover"
                          sizes="(min-width: 1024px) 200px, 50vw"
                        />
                        <span className="absolute start-2 top-2 rounded-lg bg-white p-1 text-gray-600">
                          <ListIcon aria-hidden="true" className="size-4" />
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          aria-label={t("media.remove", { number: index + 1 })}
                          onClick={() => {
                            if ("image" in item) {
                              setRemoving(item);
                              openModal();
                            } else remove(item);
                          }}
                          className="absolute end-2 top-2 rounded-full bg-white p-1 text-gray-700 disabled:opacity-50"
                        >
                          <CloseLineIcon
                            aria-hidden="true"
                            className="size-4"
                          />
                        </button>
                        <div className="absolute start-2 bottom-2 flex items-center gap-1">
                          <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-gray-900">
                            {index + 1}
                          </span>
                          {index === 0 && (
                            <span className="bg-brand-500 rounded-full px-2 py-1 text-xs text-white">
                              {t("media.primary")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 flex justify-between gap-1">
                        <button
                          type="button"
                          disabled={busy || index === 0}
                          onClick={() => move(item.token, index - 1)}
                          aria-label={t("media.earlier", { number: index + 1 })}
                          className="text-brand-500 rounded p-1 disabled:opacity-30"
                        >
                          <ChevronLeftIcon
                            aria-hidden="true"
                            className="size-4 rtl:rotate-180"
                          />
                        </button>
                        <button
                          type="button"
                          disabled={busy || index === gallery.length - 1}
                          onClick={() => move(item.token, index + 1)}
                          aria-label={t("media.later", { number: index + 1 })}
                          className="text-brand-500 rounded p-1 disabled:opacity-30"
                        >
                          <ArrowRightIcon
                            aria-hidden="true"
                            className="size-4 rtl:rotate-180"
                          />
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              <aside className="border-brand-100 bg-brand-25 dark:border-brand-900 dark:bg-brand-500/5 rounded-xl border p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {t("media.guidelines")}
                </h3>
                <ul className="mt-3 list-disc space-y-3 ps-4 text-sm leading-5 text-gray-700 dark:text-gray-300">
                  <li>{t("media.primaryHelp")}</li>
                  <li>{t("media.orderHelp")}</li>
                  <li>{t("media.limits")}</li>
                  <li>{t("media.stagedRemoval")}</li>
                </ul>
              </aside>
            </div>
          </ComponentCard>
          <ComponentCard
            title={t("media.verificationTitle")}
            className="shadow-theme-xs rounded-xl"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Controller
                name="source_id"
                control={control}
                rules={{
                  validate: (value) =>
                    ((!requireSourceWhenVerified ||
                      verification !== "verified") &&
                      !value) ||
                    (Number.isSafeInteger(Number(value)) &&
                      Number(value) > 0) ||
                    t("validation.source"),
                }}
                render={({ field }) => (
                  <TimelineRelationSelect
                    key={`source-${verification}`}
                    kind="source"
                    id="seed-source"
                    label={t("fields.source_id")}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                    eligible={verification === "verified"}
                    initialPage={
                      verification === seed.verification_status
                        ? choices.source
                        : undefined
                    }
                    initialSelection={selections.source}
                    disabled={busy}
                    error={errors.source_id?.message}
                  />
                )}
              />
              <div>
                <FilterSelect
                  {...register("verification_status", {
                    required: t("validation.selection"),
                    validate: (value) =>
                      canReview ||
                      value === "pending" ||
                      t("feedback.reviewRequired"),
                  })}
                  id="seed-verification"
                  label={`${t("fields.verification_status")} *`}
                  aria-required="true"
                  aria-invalid={!!errors.verification_status}
                  aria-describedby="seed-verification-error"
                >
                  {seedVerificationStatuses.map((value) => (
                    <option
                      key={value}
                      value={value}
                      disabled={!canReview && value !== "pending"}
                    >
                      {t(`verification.${value}`)}
                    </option>
                  ))}
                </FilterSelect>
                <p
                  id="seed-verification-error"
                  role="alert"
                  className="text-error-600 dark:text-error-400 mt-1 text-xs"
                >
                  {errors.verification_status?.message}
                </p>
              </div>
            </div>
            <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
              {t(canReview ? "media.sourceHelp" : "media.permissionHelp")}
            </p>
          </ComponentCard>
          <ComponentCard
            title={t("media.publication")}
            className="shadow-theme-xs rounded-xl"
          >
            <Controller
              name="is_active"
              control={control}
              rules={{
                validate: (value) =>
                  !value || canReview || t("feedback.reviewRequired"),
              }}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onChange={field.onChange}
                  disabled={busy || (!canReview && !field.value)}
                  label={t("active")}
                />
              )}
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("media.activeHelp")}
            </p>
            <p
              role="alert"
              className="text-error-600 dark:text-error-400 text-xs"
            >
              {errors.is_active?.message}
            </p>
          </ComponentCard>
        </fieldset>
      </form>
      {isOpen && removing && (
        <SeedConfirmDialog
          title={t("confirm.imageTitle")}
          description={t("confirm.image")}
          confirmLabel={t("confirm.remove")}
          destructive
          onClose={closeModal}
          onConfirm={() => {
            remove(removing);
            setRemoving(null);
            closeModal();
          }}
        />
      )}
    </>
  );
}
