"use client";

import { useRef, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { useRouter } from "@/i18n/navigation";
import { languages } from "@/i18n/languages";
import { saveSeason } from "@/actions/admin/seasons";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import Switch from "@/components/admin/form/switch/Switch";
import type { Season, SeasonFormValues } from "@/types/admin/season";
import SeasonTranslations from "./SeasonTranslations";

const cardClass =
  "rounded-xl shadow-theme-xs [&>div:first-child>h3]:text-xl [&>div:first-child>h3]:font-semibold";
const errorClass = "mt-1 text-xs text-error-600 dark:text-error-400";

export default function SeasonForm({ season }: { season: Season | null }) {
  const t = useTranslations("seasons");
  const router = useRouter();
  const saving = useRef(false);
  const persistedId = useRef(season?.id ?? null);
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState("");
  const locales = [
    ...new Set([
      ...languages.map(({ id }) => id),
      ...Object.keys(season?.translations ?? {}),
    ]),
  ];
  const form = useForm<SeasonFormValues>({
    defaultValues: {
      slug: season?.slug ?? "",
      is_active: season?.is_active ?? false,
      translations: Object.fromEntries(
        locales.map((locale) => [
          locale,
          {
            name: season?.translations[locale]?.name ?? "",
            description: season?.translations[locale]?.description ?? "",
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

  function submit(values: SeasonFormValues) {
    if (saving.current) return;
    saving.current = true;
    setFailure("");
    clearErrors();
    startTransition(async () => {
      try {
        const result = await saveSeason(
          persistedId.current,
          {
            slug: values.slug,
            translations: Object.fromEntries(
              locales
                .filter((locale) =>
                  languages.some((language) => language.id === locale),
                )
                .map((locale) => [
                  locale,
                  {
                    name: values.translations[locale].name,
                    description:
                      values.translations[locale].description || null,
                  },
                ]),
            ),
          },
          values.is_active,
        );
        if (result.data) {
          persistedId.current = result.data.id;
        }
        if (!result.success || !result.data) {
          for (const [field, messages] of Object.entries(result.errors ?? {})) {
            if (!messages[0]) continue;
            if (field === "slug" || field === "is_active") {
              setError(field, { type: "server", message: messages[0] });
            } else {
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
          }
          const message = result.message || t("feedback.saveFailed");
          setFailure(message);
          toast.error(message);
          return;
        }
        if (!season) {
          reset({
            slug: "",
            is_active: false,
            translations: Object.fromEntries(
              languages.map(({ id }) => [id, { name: "", description: "" }]),
            ),
          });
          persistedId.current = null;
        } else {
          reset({ ...values, is_active: result.data.is_active });
        }
        toast.success(result.message || t("feedback.saved"));
        router.push("/admin/seasons");
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
        <legend className="sr-only">{t("form.basic")}</legend>
        <div className="min-w-0 space-y-5 xl:col-span-2">
          <ComponentCard title={t("form.basic")} className={cardClass}>
            <div>
              <Label htmlFor="season-slug">
                {t("fields.slug")}{" "}
                <span aria-hidden="true" className="text-error-600">
                  *
                </span>
              </Label>
              <Input
                {...register("slug", {
                  required: t("validation.slugRequired"),
                  maxLength: {
                    value: 255,
                    message: t("validation.max", { count: 255 }),
                  },
                  pattern: {
                    value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                    message: t("validation.slugFormat"),
                  },
                })}
                id="season-slug"
                aria-required="true"
                aria-invalid={!!errors.slug}
                aria-describedby="season-slug-help season-slug-error"
                error={!!errors.slug}
                autoCapitalize="none"
                spellCheck={false}
                placeholder={t("form.slugPlaceholder")}
              />
              <p
                id="season-slug-help"
                className="mt-2 text-sm text-gray-500 dark:text-gray-400"
              >
                {t("form.slugHelp")}
              </p>
              <p id="season-slug-error" role="alert" className={errorClass}>
                {errors.slug?.message}
              </p>
            </div>
          </ComponentCard>
          <ComponentCard title={t("translations.title")} className={cardClass}>
            <SeasonTranslations form={form} locales={locales} />
          </ComponentCard>
        </div>
        <aside className="min-w-0 space-y-5">
          <ComponentCard title={t("form.publication")} className={cardClass}>
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <div
                  ref={field.ref}
                  role="switch"
                  aria-checked={field.value}
                  aria-label={t("form.activeLabel")}
                  aria-invalid={!!errors.is_active}
                  aria-describedby="season-active-help season-active-error"
                  aria-disabled={busy}
                  tabIndex={busy ? -1 : 0}
                  onBlur={field.onBlur}
                  onKeyDown={(event) => {
                    if (!busy && [" ", "Enter"].includes(event.key)) {
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
                    label={t("form.activeLabel")}
                  />
                </div>
              )}
            />
            <p
              id="season-active-help"
              className="text-sm text-gray-500 dark:text-gray-400"
            >
              {t("form.activeHelp")}
            </p>
            <p id="season-active-error" role="alert" className={errorClass}>
              {errors.is_active?.message}
            </p>
          </ComponentCard>
          <ComponentCard title={t("form.guidelines")} className={cardClass}>
            <ul className="marker:text-success-500 list-disc space-y-3 ps-5 text-sm leading-6 text-gray-700 dark:text-gray-300">
              <li>{t("form.guideCategory")}</li>
              <li>{t("form.guideCalendar")}</li>
              <li>{t("form.guideNames")}</li>
              <li>{t("form.guideSlug")}</li>
              <li>{t("form.guideLanguages")}</li>
              <li>{t("form.guideHistory")}</li>
            </ul>
          </ComponentCard>
        </aside>
      </fieldset>
      <div className="flex flex-wrap justify-end gap-3 py-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (!saving.current) router.push("/admin/seasons");
          }}
          className="focus-visible:outline-brand-500 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus-visible:outline-2 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          disabled={busy}
          className="bg-brand-600 hover:bg-brand-700 focus-visible:outline-brand-500 rounded-lg px-6 py-3 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
        >
          {busy ? t("saving") : season ? t("form.update") : t("form.save")}
        </button>
      </div>
    </form>
  );
}
