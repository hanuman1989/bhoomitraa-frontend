"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { languages, getLanguage } from "@/i18n/languages";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import type { ActionResult } from "@/types/api";
type InstructionsField = "planting_instructions" | "usage_instructions";
type ProductTranslation<Field extends InstructionsField> = {
  name: string;
  description: string | null;
} & Record<Field, string | null>;
interface TranslationValues {
  translations: Record<
    string,
    { name: string; description: string; [field: string]: string }
  >;
}

const textAreaClass =
  "w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 shadow-theme-xs outline-none focus:border-brand-500 aria-invalid:border-error-500 dark:border-gray-700 dark:text-gray-100";
export default function Step2Translations<
  Field extends InstructionsField = "planting_instructions",
>({
  seed,
  busy,
  onDirty,
  onSave,
  namespace = "seeds",
  formId = "seed-step-2",
  instructionsField = "planting_instructions" as Field,
}: {
  seed: { translations: Record<string, ProductTranslation<NoInfer<Field>>> };
  namespace?: "seeds" | "fertilizers";
  formId?: string;
  instructionsField?: Field;
  busy: boolean;
  onDirty: (dirty: boolean) => void;
  onSave: (
    values: Record<string, ProductTranslation<NoInfer<Field>>>,
  ) => Promise<ActionResult<unknown>>;
}) {
  const t = useTranslations(namespace);
  const locales = [
    ...new Set([
      ...languages.map(({ id }) => id),
      ...Object.keys(seed.translations),
    ]),
  ];
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<TranslationValues>({
    defaultValues: {
      translations: Object.fromEntries(
        locales.map((id) => [
          id,
          {
            name: seed.translations[id]?.name ?? "",
            description: seed.translations[id]?.description ?? "",
            [instructionsField]:
              seed.translations[id]?.[instructionsField] ?? "",
          },
        ]),
      ),
    },
    mode: "onTouched",
  });
  useEffect(() => onDirty(isDirty), [isDirty, onDirty]);
  async function submit(values: TranslationValues) {
    const result = await onSave(
      Object.fromEntries(
        languages.map(({ id }) => [
          id,
          {
            name: values.translations[id].name.trim(),
            description: values.translations[id].description.trim() || null,
            [instructionsField]:
              values.translations[id][instructionsField].trim() || null,
          },
        ]),
      ) as Record<string, ProductTranslation<Field>>,
    );
    for (const [key, messages] of Object.entries(result.errors ?? {}))
      for (const { id } of languages) {
        if (!messages[0]) continue;
        if (key === `translations.${id}.name`)
          setError(`translations.${id}.name`, {
            type: "server",
            message: messages[0],
          });
        if (key === `translations.${id}.description`)
          setError(`translations.${id}.description`, {
            type: "server",
            message: messages[0],
          });
        if (key === `translations.${id}.${instructionsField}`)
          setError(`translations.${id}.${instructionsField}`, {
            type: "server",
            message: messages[0],
          });
      }
  }
  return (
    <form
      id={formId}
      onSubmit={handleSubmit(submit)}
      noValidate
      aria-busy={busy}
    >
      <fieldset
        disabled={busy}
        className="grid items-start gap-5 xl:grid-cols-4"
      >
        <legend className="sr-only">{t("translations.title")}</legend>
        <ComponentCard
          title={t("translations.title")}
          desc={t("translations.description")}
          className="shadow-theme-xs rounded-xl xl:col-span-3"
        >
          <div className="space-y-4">
            {locales.map((id) => {
              const configured = languages.some(
                  (language) => language.id === id,
                ),
                language = configured
                  ? getLanguage(id)
                  : { name: id, dir: "ltr" as const };
              const error = errors.translations?.[id];
              return (
                <section
                  key={id}
                  aria-labelledby={`seed-language-${id}`}
                  className="grid gap-5 rounded-xl border border-gray-200 p-4 md:grid-cols-4 dark:border-gray-700"
                >
                  <h3
                    id={`seed-language-${id}`}
                    className="flex items-start gap-3 font-semibold text-gray-900 dark:text-white"
                  >
                    <span className="bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300 rounded-lg px-2 py-1 text-sm uppercase">
                      {id}
                    </span>
                    {language.name}
                    {configured && " *"}
                  </h3>
                  <div className="space-y-4 md:col-span-3">
                    <div>
                      <Label htmlFor={`seed-${id}-name`}>
                        {t("translations.name")}
                        {configured && " *"}
                      </Label>
                      <Input
                        {...register(`translations.${id}.name`, {
                          required: configured
                            ? t("validation.name", { language: language.name })
                            : false,
                          validate: (value) =>
                            !configured ||
                            !!value.trim() ||
                            t("validation.name", { language: language.name }),
                          maxLength: configured
                            ? {
                                value: 200,
                                message: t("validation.max", { count: 200 }),
                              }
                            : undefined,
                        })}
                        id={`seed-${id}-name`}
                        lang={id}
                        dir={language.dir}
                        readOnly={!configured}
                        aria-required={configured}
                        aria-invalid={!!error?.name}
                        aria-describedby={`seed-${id}-name-error`}
                        error={!!error?.name}
                        placeholder={t("translations.namePlaceholder", {
                          language: language.name,
                        })}
                      />
                      <p
                        id={`seed-${id}-name-error`}
                        role="alert"
                        className="text-error-600 dark:text-error-400 mt-1 text-xs"
                      >
                        {error?.name?.message}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor={`seed-${id}-description`}>
                        {t("translations.descriptionLabel")}
                      </Label>
                      <textarea
                        {...register(`translations.${id}.description`, {
                          maxLength: configured
                            ? {
                                value: 65535,
                                message: t("validation.max", { count: 65535 }),
                              }
                            : undefined,
                        })}
                        id={`seed-${id}-description`}
                        lang={id}
                        dir={language.dir}
                        readOnly={!configured}
                        rows={3}
                        aria-invalid={!!error?.description}
                        aria-describedby={`seed-${id}-description-error`}
                        placeholder={t("translations.descriptionPlaceholder", {
                          language: language.name,
                        })}
                        className={textAreaClass}
                      />
                      <p
                        id={`seed-${id}-description-error`}
                        role="alert"
                        className="text-error-600 dark:text-error-400 mt-1 text-xs"
                      >
                        {error?.description?.message}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor={`seed-${id}-instructions`}>
                        {t("translations.instructions")}
                      </Label>
                      <textarea
                        {...register(
                          `translations.${id}.${instructionsField}`,
                          {
                            maxLength: configured
                              ? {
                                  value: 65535,
                                  message: t("validation.max", {
                                    count: 65535,
                                  }),
                                }
                              : undefined,
                          },
                        )}
                        id={`seed-${id}-instructions`}
                        lang={id}
                        dir={language.dir}
                        readOnly={!configured}
                        rows={3}
                        aria-invalid={!!error?.[instructionsField]}
                        aria-describedby={`seed-${id}-instructions-error`}
                        placeholder={t("translations.instructionsPlaceholder", {
                          language: language.name,
                        })}
                        className={textAreaClass}
                      />
                      <p
                        id={`seed-${id}-instructions-error`}
                        role="alert"
                        className="text-error-600 dark:text-error-400 mt-1 text-xs"
                      >
                        {error?.[instructionsField]?.message}
                      </p>
                    </div>
                    {!configured && (
                      <p className="text-warning-700 dark:text-warning-400 text-xs">
                        {t("translations.legacy")}
                      </p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </ComponentCard>
        <aside className="space-y-5">
          <ComponentCard
            title={t("translations.guidelines")}
            className="bg-brand-25 dark:bg-brand-500/5 rounded-xl"
          >
            <ul className="list-disc space-y-4 ps-4 text-sm leading-6 text-gray-700 dark:text-gray-300">
              <li>{t("translations.guideNames")}</li>
              <li>{t("translations.guideOptional")}</li>
              <li>{t("translations.guideConsistency")}</li>
            </ul>
          </ComponentCard>
          <p className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
            {t("translations.requiredCount", { count: languages.length })}
          </p>
        </aside>
      </fieldset>
    </form>
  );
}
