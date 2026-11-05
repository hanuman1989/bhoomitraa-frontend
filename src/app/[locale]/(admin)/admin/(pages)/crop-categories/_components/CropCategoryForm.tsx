"use client";

import { useRef, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { useRouter } from "@/i18n/navigation";
import { languages } from "@/i18n/languages";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import Switch from "@/components/admin/form/switch/Switch";
import { CheckLineIcon, InfoIcon } from "@/icons";
import { saveCropCategory } from "@/actions/admin/cropCategories";
import type {
  CropCategory,
  CropCategoryFormValues,
} from "@/types/admin/cropCategory";
import CropCategoryTranslationFields from "./CropCategoryTranslationFields";

export default function CropCategoryForm({
  category,
}: {
  category?: CropCategory;
}) {
  const t = useTranslations("cropCategories");
  const router = useRouter();
  const saving = useRef(false);
  const persistedId = useRef(category?.id ?? null);
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState("");
  const form = useForm<CropCategoryFormValues>({
    defaultValues: {
      slug: category?.slug ?? "",
      is_active: category?.is_active ?? false,
      translations: Object.fromEntries(
        languages.map(({ id }) => [
          id,
          {
            name: category?.translations?.[id]?.name ?? "",
            description: category?.translations?.[id]?.description ?? "",
          },
        ]),
      ),
    },
    mode: "onTouched",
  });
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = form;
  const busy = pending;
  function submit(values: CropCategoryFormValues) {
    if (saving.current) return;
    saving.current = true;
    setFailure("");
    startTransition(async () => {
      try {
        const result = await saveCropCategory(
          persistedId.current,
          {
            slug: values.slug,
            translations: Object.fromEntries(
              languages.map(({ id }) => [
                id,
                {
                  name: values.translations[id].name,
                  description: values.translations[id].description || null,
                },
              ]),
            ),
          },
          values.is_active,
        );
        if (result.data) persistedId.current = result.data.id;
        if (!result.success) {
          for (const [field, messages] of Object.entries(result.errors ?? {})) {
            if (!messages[0]) continue;
            switch (field) {
              case "slug":
              case "is_active":
                setError(field, { type: "server", message: messages[0] });
                break;
              default:
                for (const { id } of languages) {
                  if (field === `translations.${id}.name`)
                    setError(`translations.${id}.name`, {
                      type: "server",
                      message: messages[0],
                    });
                  if (field === `translations.${id}.description`)
                    setError(`translations.${id}.description`, {
                      type: "server",
                      message: messages[0],
                    });
                }
            }
          }
          const message = result.message || t("feedback.saveFailed");
          setFailure(message);
          toast.error(message);
          return;
        }
        // Cache Components preserves this page when navigating away and back.
        // A completed create must return as a fresh form, including its retry ID.
        if (!category) {
          reset();
          persistedId.current = null;
        }
        toast.success(result.message || t("feedback.saved"));
        router.push("/admin/crop-categories");
      } catch {
        setFailure(t("feedback.saveFailed"));
        toast.error(t("feedback.saveFailed"));
      } finally {
        saving.current = false;
      }
    });
  }
  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(submit)(event);
      }}
      noValidate
      aria-busy={busy}
      className="space-y-6"
    >
      {failure && (
        <p
          role="alert"
          className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-950 dark:text-error-300 rounded-xl border p-4 text-sm"
        >
          {failure}
        </p>
      )}
      <fieldset
        disabled={busy}
        className="grid min-w-0 items-start gap-5 disabled:opacity-70 xl:grid-cols-3"
      >
        <legend className="sr-only">{t("form.basicTitle")}</legend>
        <div className="min-w-0 xl:col-span-2">
          <ComponentCard
            title={t("form.basicTitle")}
            className="shadow-theme-xs rounded-xl"
          >
            <div>
              <Label htmlFor="category-slug">
                {t("fields.slug")}{" "}
                <span aria-hidden="true" className="text-error-600">
                  *
                </span>
              </Label>
              <Input
                {...register("slug", {
                  required: t("form.slugRequired"),
                  maxLength: { value: 255, message: t("form.slugMax") },
                  pattern: {
                    value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                    message: t("form.slugInvalid"),
                  },
                })}
                id="category-slug"
                placeholder={t("form.slugPlaceholder")}
                aria-required="true"
                aria-invalid={!!errors.slug}
                aria-describedby="category-slug-help category-slug-error"
                error={!!errors.slug}
              />
              <p
                id="category-slug-help"
                className="mt-2 text-xs text-gray-500 dark:text-gray-400"
              >
                {t("form.slugHelp")}
              </p>
              <p
                id="category-slug-error"
                role="alert"
                className="text-error-600 dark:text-error-400 mt-1 text-xs"
              >
                {errors.slug?.message}
              </p>
            </div>
            <CropCategoryTranslationFields form={form} />
          </ComponentCard>
        </div>
        <aside className="min-w-0 space-y-5">
          <ComponentCard
            title={t("form.publicationTitle")}
            desc={t("form.publicationHelp")}
            className="shadow-theme-xs rounded-xl"
          >
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <div
                  ref={field.ref}
                  role="switch"
                  aria-checked={field.value}
                  aria-label={t("form.publicationTitle")}
                  aria-describedby="category-status-help category-status-error"
                  aria-invalid={!!errors.is_active}
                  aria-disabled={busy}
                  tabIndex={busy ? -1 : 0}
                  onBlur={field.onBlur}
                  onKeyDown={(event) => {
                    if (!busy && (event.key === " " || event.key === "Enter")) {
                      event.preventDefault();
                      field.onChange(!field.value);
                    }
                  }}
                  className="focus-visible:outline-brand-500 inline-flex rounded-lg p-1 focus-visible:outline-2"
                >
                  <Switch
                    key={String(field.value)}
                    defaultChecked={field.value}
                    disabled={busy}
                    onChange={field.onChange}
                    label={field.value ? t("active") : t("inactive")}
                  />
                </div>
              )}
            />
            <p
              id="category-status-help"
              className="text-xs text-gray-500 dark:text-gray-400"
            >
              {t("form.statusHelp")}
            </p>
            <p
              id="category-status-error"
              role="alert"
              className="text-error-600 dark:text-error-400 text-xs"
            >
              {errors.is_active?.message}
            </p>
          </ComponentCard>
          <ComponentCard
            title={t("form.guidelinesTitle")}
            className="border-brand-100 bg-brand-50/70 [&>div:last-child]:border-brand-100 dark:border-brand-900 dark:bg-brand-950/40 dark:[&>div:last-child]:border-brand-900 rounded-xl"
          >
            <div className="flex items-start gap-2">
              <InfoIcon
                aria-hidden="true"
                className="text-brand-500 mt-1 size-5 shrink-0"
              />
              <ul className="list-disc space-y-3 ps-4 text-sm leading-6 text-gray-700 dark:text-gray-300">
                <li>{t("form.guidelineNames")}</li>
                <li>{t("form.guidelineSlug")}</li>
                <li>{t("form.guidelineDescription")}</li>
                <li>{t("form.guidelineStatus")}</li>
              </ul>
            </div>
          </ComponentCard>
        </aside>
      </fieldset>
      <div className="shadow-theme-xs sticky bottom-0 z-9 flex flex-wrap justify-end gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <button
          type="button"
          disabled={busy}
          onClick={() => router.push("/admin/crop-categories")}
          className="focus-visible:outline-brand-500 rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus-visible:outline-2 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          {t("form.cancel")}
        </button>
        <button
          disabled={busy}
          className="bg-brand-600 hover:bg-brand-700 focus-visible:outline-brand-500 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white focus-visible:outline-2 disabled:opacity-50"
        >
          <CheckLineIcon aria-hidden="true" className="size-5" />
          {busy
            ? t("form.saving")
            : category
              ? t("form.update")
              : t("form.save")}
        </button>
      </div>
    </form>
  );
}
