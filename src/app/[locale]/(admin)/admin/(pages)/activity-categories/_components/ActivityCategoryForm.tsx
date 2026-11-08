"use client";

import { useRef, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { useRouter } from "@/i18n/navigation";
import { languages } from "@/i18n/languages";
import { isActivityCategoryIcon } from "@/icons/activityCategoryIcons";
import { saveActivityCategory } from "@/actions/admin/activityCategories";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import Switch from "@/components/admin/form/switch/Switch";
import {
  requiredActivityCategoryLocales,
  type ActivityCategory,
  type ActivityCategoryFormValues,
} from "@/types/admin/activityCategory";
import ActivityIconSelect from "./ActivityIconSelect";
import ActivityCategoryTranslations from "./ActivityCategoryTranslations";
import ActivityCategorySettings from "./ActivityCategorySettings";

const cardClass =
  "rounded-xl shadow-theme-xs [&>div:first-child>h3]:text-xl [&>div:first-child>h3]:font-semibold";

export default function ActivityCategoryForm({
  category,
  canManageSystem,
}: {
  category: ActivityCategory | null;
  canManageSystem: boolean;
}) {
  const t = useTranslations("activityCategories");
  const router = useRouter();
  const saving = useRef(false);
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState("");
  const readOnly = !!category?.is_system && !canManageSystem;
  const locales = [
    ...new Set([
      ...languages.map(({ id }) => id),
      ...Object.keys(category?.translations ?? {}),
    ]),
  ];
  const form = useForm<ActivityCategoryFormValues>({
    defaultValues: {
      slug: category?.slug ?? "",
      icon: category?.icon ?? "",
      is_system: category?.is_system ?? false,
      translations: Object.fromEntries(
        locales.map((locale) => [
          locale,
          {
            name: category?.translations[locale]?.name ?? "",
            description: category?.translations[locale]?.description ?? "",
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
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = form;
  const busy = pending || isSubmitting;

  function submit(values: ActivityCategoryFormValues) {
    if (saving.current || readOnly) return;
    saving.current = true;
    setFailure("");
    clearErrors();
    startTransition(async () => {
      try {
        const translations = Object.fromEntries(
          languages
            .filter(
              ({ id }) =>
                requiredActivityCategoryLocales.some(
                  (required) => required === id,
                ) ||
                !!category?.translations[id] ||
                !!values.translations[id].name.trim() ||
                !!values.translations[id].description.trim(),
            )
            .map(({ id }) => [
              id,
              {
                name: values.translations[id].name.trim(),
                description: values.translations[id].description.trim() || null,
              },
            ]),
        );
        const result = await saveActivityCategory(category?.id ?? null, {
          slug: values.slug.trim(),
          icon: values.icon || null,
          is_system: category?.is_system ?? values.is_system,
          translations,
        });
        if (!result.success || !result.data) {
          for (const [field, messages] of Object.entries(result.errors ?? {})) {
            if (!messages[0]) continue;
            if (field === "slug" || field === "icon" || field === "is_system")
              setError(field, { type: "server", message: messages[0] });
            else
              for (const locale of locales) {
                if (field === `translations.${locale}.name`)
                  setError(`translations.${locale}.name`, {
                    type: "server",
                    message: messages[0],
                  });
                if (field === `translations.${locale}.description`)
                  setError(`translations.${locale}.description`, {
                    type: "server",
                    message: messages[0],
                  });
              }
          }
          const message = result.message || t("feedback.saveFailed");
          setFailure(message);
          toast.error(message);
          return;
        }
        if (!category)
          reset({
            slug: "",
            icon: "",
            is_system: false,
            translations: Object.fromEntries(
              languages.map(({ id }) => [id, { name: "", description: "" }]),
            ),
          });
        else reset(values);
        toast.success(result.message || t("feedback.saved"));
        router.push("/admin/activity-categories");
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
      className="space-y-5"
    >
      {readOnly && (
        <p
          role="status"
          className="border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-800 dark:bg-warning-950 dark:text-warning-300 rounded-xl border p-4 text-sm"
        >
          {t("form.systemReadOnly")}
        </p>
      )}
      {failure && (
        <p
          role="alert"
          className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-950 dark:text-error-300 rounded-xl border p-4 text-sm"
        >
          {failure}
        </p>
      )}
      <fieldset
        disabled={busy || readOnly}
        className="grid min-w-0 items-start gap-5 disabled:opacity-70 xl:grid-cols-3"
      >
        <legend className="sr-only">{t("form.basic")}</legend>
        <div className="min-w-0 space-y-5 xl:col-span-2">
          <ComponentCard title={t("form.basic")} className={cardClass}>
            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <Label htmlFor="activity-category-slug">
                  {t("fields.slug")}{" "}
                  <span aria-hidden="true" className="text-error-600">
                    *
                  </span>
                </Label>
                <Input
                  {...register("slug", {
                    required: t("validation.slugRequired"),
                    pattern: {
                      value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                      message: t("validation.slugFormat"),
                    },
                    maxLength: {
                      value: 180,
                      message: t("validation.max", { count: 180 }),
                    },
                  })}
                  id="activity-category-slug"
                  readOnly={!!category?.is_system}
                  autoComplete="off"
                  placeholder={t("form.slugPlaceholder")}
                  aria-required="true"
                  aria-invalid={!!errors.slug}
                  aria-describedby="activity-category-slug-help activity-category-slug-error"
                  error={!!errors.slug}
                />
                {category?.is_system && (
                  <p
                    id="activity-category-slug-help"
                    className="mt-1 text-xs text-gray-500 dark:text-gray-400"
                  >
                    {t("form.slugLocked")}
                  </p>
                )}
                {errors.slug && (
                  <p
                    id="activity-category-slug-error"
                    role="alert"
                    className="text-error-600 dark:text-error-400 mt-1 text-xs"
                  >
                    {errors.slug.message}
                  </p>
                )}
              </div>
              <Controller
                name="icon"
                control={control}
                rules={{
                  validate: (value) =>
                    value === "" ||
                    isActivityCategoryIcon(value) ||
                    t("validation.icon"),
                }}
                render={({ field }) => (
                  <ActivityIconSelect
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                    disabled={busy || readOnly}
                    error={errors.icon?.message}
                  />
                )}
              />
              <div>
                <Label>{t("fields.system")}</Label>
                <Controller
                  name="is_system"
                  control={control}
                  render={({ field }) => {
                    const allowed = !category && canManageSystem && !busy;
                    return (
                      <div
                        ref={field.ref}
                        role="switch"
                        aria-label={t("form.systemLabel")}
                        aria-checked={field.value}
                        aria-disabled={!allowed}
                        aria-invalid={!!errors.is_system}
                        aria-describedby="activity-category-system-help activity-category-system-error"
                        tabIndex={allowed ? 0 : -1}
                        onBlur={field.onBlur}
                        onKeyDown={(event) => {
                          if (allowed && [" ", "Enter"].includes(event.key)) {
                            event.preventDefault();
                            field.onChange(!field.value);
                          }
                        }}
                        className="focus-visible:outline-brand-500 rounded-lg p-1 focus-visible:outline-2"
                      >
                        <Switch
                          key={String(field.value)}
                          defaultChecked={field.value}
                          disabled={!allowed}
                          onChange={(value) => {
                            if (allowed) field.onChange(value);
                          }}
                          label={t("form.systemLabel")}
                        />
                      </div>
                    );
                  }}
                />
                <p
                  id="activity-category-system-help"
                  className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400"
                >
                  {t(category ? "form.systemImmutable" : "form.systemHelp")}
                </p>
                {errors.is_system && (
                  <p
                    id="activity-category-system-error"
                    role="alert"
                    className="text-error-600 dark:text-error-400 mt-1 text-xs"
                  >
                    {errors.is_system.message}
                  </p>
                )}
              </div>
            </div>
          </ComponentCard>
          <ComponentCard title={t("translations.title")} className={cardClass}>
            <ActivityCategoryTranslations
              form={form}
              locales={locales}
              savedLocales={Object.keys(category?.translations ?? {})}
            />
          </ComponentCard>
        </div>
        <ActivityCategorySettings
          category={category}
          busy={busy}
          canManageSystem={canManageSystem}
        />
      </fieldset>
      <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-800">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (!saving.current) router.push("/admin/activity-categories");
          }}
          className="border-brand-200 text-brand-500 hover:bg-brand-50 focus-visible:outline-brand-500 dark:text-brand-400 rounded-lg border bg-white px-6 py-3 text-sm font-semibold focus-visible:outline-2 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
        >
          {t("cancel")}
        </button>
        {!readOnly && (
          <button
            type="submit"
            disabled={busy}
            className="bg-brand-500 hover:bg-brand-600 focus-visible:outline-brand-500 rounded-lg px-6 py-3 text-sm font-semibold text-white focus-visible:outline-2 disabled:opacity-50"
          >
            {busy ? t("saving") : t(category ? "form.update" : "form.save")}
          </button>
        )}
      </div>
    </form>
  );
}
