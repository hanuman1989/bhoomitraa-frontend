"use client";

import { useEffect, useRef, useState } from "react";
import { FormProvider, useForm, type FieldPath } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { useRouter } from "@/i18n/navigation";
import { languages } from "@/i18n/languages";
import ProductWizardSteps from "@/components/admin/common/ProductWizardSteps";
import { ArrowRightIcon, CheckLineIcon } from "@/icons";
import {
  finalizeCropFieldLayout,
  saveCropFieldLayoutBasic,
  saveCropFieldLayoutConfiguration,
  saveCropFieldLayoutTranslations,
} from "@/actions/admin/cropFieldLayouts";
import type { ActionResult, ApiValidationErrors } from "@/types/api";
import type { TimelineOptionPage } from "@/types/admin/cropStageTimeline";
import {
  fieldLayoutTranslationLimits,
  type CropFieldLayout,
  type CropFieldLayoutFormValues,
  type CropFieldLayoutOptions,
  type CropFieldLayoutReview,
  type CropFieldLayoutSections,
  type FieldLayoutStep,
} from "@/types/admin/cropFieldLayout";
import SeedConfirmDialog from "../../seeds/_components/SeedConfirmDialog";
import BasicDetailsStep from "./BasicDetailsStep";
import ConfigurationStep from "./ConfigurationStep";
import TranslationsStep from "./TranslationsStep";
import FieldLayoutReview from "./FieldLayoutReview";
import { configurationDefaults, prepareConfiguration } from "./configuration";

const steps = [1, 2, 3, 4] as const;
const translationFields = [
  "title",
  "description",
  "important_considerations",
] as const;
const listPath = "/admin/crop-field-layouts";
const outline =
  "inline-flex h-9 items-center gap-2 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800";

function fieldStep(field: string): FieldLayoutStep {
  if (field.startsWith("translations")) return 3;
  if (field.startsWith("configuration") || field === "reference_note") return 2;
  return 1;
}

export default function FieldLayoutForm({
  step,
  layout,
  sections,
  review,
  options,
  crops,
}: {
  step: FieldLayoutStep;
  layout: CropFieldLayout | null;
  sections: CropFieldLayoutSections | null;
  review?: CropFieldLayoutReview;
  options: CropFieldLayoutOptions;
  crops?: TimelineOptionPage;
}) {
  const t = useTranslations("cropFieldLayouts");
  const router = useRouter();
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const [failure, setFailure] = useState("");
  const [errors, setErrors] = useState<ApiValidationErrors>({});
  const basic = sections?.basic_details;
  const savedConfiguration = sections?.layout_configuration;
  const definition = options.layout_types.find(
    ({ value }) => value === basic?.layout_type,
  );
  const locales = options.supported_locales.filter(({ value }) =>
    languages.some(({ id }) => id === value),
  );
  const missingLanguage = options.supported_locales.some(
    ({ value, required }) =>
      required && !locales.some((locale) => locale.value === value),
  );
  const translations = sections?.translations;
  const form = useForm<CropFieldLayoutFormValues>({
    defaultValues: {
      crop_scope: basic?.crop_scope ?? "specific",
      crop_ids: basic?.crop_ids ?? [],
      crop_variety_id: basic?.crop_variety_id ?? null,
      sowing_method_id: basic?.sowing_method_id ?? null,
      farming_type: basic?.farming_type ?? null,
      growing_system: basic?.growing_system ?? null,
      layout_type: basic?.layout_type ?? "",
      sort_order: basic?.sort_order ?? 0,
      is_active: layout?.wizard.requested_is_active ?? false,
      configuration: definition
        ? configurationDefaults(
            definition,
            savedConfiguration?.configuration ?? {},
          )
        : {},
      reference_note: savedConfiguration?.reference_note ?? "",
      translations: Object.fromEntries(
        languages.map(({ id }) => [
          id,
          {
            title: translations?.[id]?.title ?? "",
            description: translations?.[id]?.description ?? "",
            important_considerations:
              translations?.[id]?.important_considerations ?? "",
          },
        ]),
      ),
    },
    mode: "onTouched",
  });
  const { isDirty } = form.formState;
  const persistedWizard = review?.wizard ?? layout?.wizard;
  const maxStep = Math.min(4, (persistedWizard?.completed_step ?? 0) + 1);

  useEffect(() => {
    if (!isDirty) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  function goTo(href: string) {
    if (saving.current) return;
    if (isDirty) setLeaveTo(href);
    else router.push(href);
  }

  function editStep(next: FieldLayoutStep) {
    if (layout) goTo(`${listPath}/${layout.id}/edit?step=${next}`);
  }

  function showErrors(fieldErrors: ApiValidationErrors) {
    setErrors(fieldErrors);
    if (step === 4) return;
    for (const [key, messages] of Object.entries(fieldErrors)) {
      const field = key.startsWith("crop_ids.") ? "crop_ids" : key;
      if (messages[0] && fieldStep(field) === step) {
        form.setError(field as FieldPath<CropFieldLayoutFormValues>, {
          type: "server",
          message: messages[0],
        });
      }
    }
  }

  async function save(values: CropFieldLayoutFormValues) {
    if (saving.current) return;
    setFailure("");
    setErrors({});
    form.clearErrors();
    const revision = persistedWizard?.revision ?? 0;
    let request: () => Promise<ActionResult<CropFieldLayout>>;

    if (step === 1) {
      const {
        crop_scope,
        crop_ids,
        crop_variety_id,
        sowing_method_id,
        farming_type,
        growing_system,
        layout_type,
        sort_order,
        is_active,
      } = values;
      const invalid: ApiValidationErrors = {};
      if (!options.layout_types.some(({ value }) => value === layout_type)) {
        invalid.layout_type = [t("basic.invalidOption")];
      }
      if (
        crop_scope === "specific" &&
        (crop_ids.length === 0 ||
          crop_ids.length > 1000 ||
          new Set(crop_ids).size !== crop_ids.length ||
          crop_ids.some((id) => !Number.isSafeInteger(id) || id < 1))
      ) {
        invalid.crop_ids = [t("basic.invalidCropCount")];
      }
      if (
        !Number.isInteger(sort_order) ||
        sort_order < 0 ||
        sort_order > 65535
      ) {
        invalid.sort_order = [t("basic.invalidSortOrder")];
      }
      if (Object.keys(invalid).length) {
        showErrors(invalid);
        return;
      }
      request = () =>
        saveCropFieldLayoutBasic(layout?.id ?? null, revision, {
          crop_scope,
          crop_ids: crop_scope === "all" ? [] : crop_ids,
          crop_variety_id:
            crop_scope === "specific" && crop_ids.length === 1
              ? crop_variety_id
              : null,
          sowing_method_id,
          farming_type,
          growing_system,
          layout_type,
          sort_order,
          is_active,
        });
    } else {
      if (!layout) return;
      const id = layout.id;
      if (step === 2) {
        if (!definition) return;
        const { configuration, errors: invalid } = prepareConfiguration(
          definition,
          values.configuration,
        );
        const fieldErrors: ApiValidationErrors = Object.fromEntries(
          Object.entries(invalid).map(([field, code]) => [
            `configuration.${field}`,
            [t(`configuration.validation.${code}`)],
          ]),
        );
        if (values.reference_note.length > 500) {
          fieldErrors.reference_note = [
            t("configuration.validation.referenceMax", { max: 500 }),
          ];
        }
        if (Object.keys(fieldErrors).length) {
          showErrors(fieldErrors);
          return;
        }
        request = () =>
          saveCropFieldLayoutConfiguration(id, revision, {
            configuration,
            reference_note: values.reference_note || null,
          });
      } else if (step === 3) {
        if (missingLanguage || !locales.length) {
          setFailure(t("languageMismatch"));
          return;
        }
        const invalid: ApiValidationErrors = {};
        for (const { value, required } of locales) {
          const entry = values.translations[value];
          for (const field of translationFields) {
            const path = `translations.${value}.${field}`;
            const max = fieldLayoutTranslationLimits[field];
            const content = entry[field];
            if (
              required &&
              field !== "important_considerations" &&
              !content.trim()
            ) {
              invalid[path] = [t("translations.required")];
            } else if (Array.from(content).length > max) {
              invalid[path] = [t("translations.max", { max })];
            }
          }
        }
        if (Object.keys(invalid).length) {
          showErrors(invalid);
          return;
        }
        request = () =>
          saveCropFieldLayoutTranslations(
            id,
            revision,
            Object.fromEntries(
              locales.flatMap(({ value, required }) => {
                const entry = values.translations[value];
                return required || entry.title.trim()
                  ? [
                      [
                        value,
                        {
                          title: entry.title,
                          description: entry.description || null,
                          important_considerations:
                            entry.important_considerations || null,
                        },
                      ],
                    ]
                  : [];
              }),
            ),
          );
      } else {
        if (!review?.wizard.can_finalize) return;
        request = () => finalizeCropFieldLayout(id, revision);
      }
    }

    saving.current = true;
    setBusy(true);
    try {
      const result = await request();
      if (!result.success || !result.data) {
        const message = result.message || t("saveFailed");
        setFailure(message);
        toast.error(message);
        if (result.errors) showErrors(result.errors);
        return;
      }
      form.reset();
      if (step === 4) {
        toast.success(result.message || t("saved"));
        router.replace(listPath);
      } else {
        const next = `${listPath}/${result.data.id}/edit?step=${step + 1}`;
        if (layout) router.push(next);
        else router.replace(next);
      }
    } catch {
      setFailure(t("saveFailed"));
      toast.error(t("saveFailed"));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  const warnings =
    step === 4 ? { ...review?.wizard.readiness_errors, ...errors } : errors;
  const fieldMessages = [...new Set(Object.values(warnings).flat())];
  const editing = Boolean(
    layout?.wizard.is_finalized || layout?.wizard.has_pending_edit,
  );
  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={(event) => {
          void form.handleSubmit(save)(event);
        }}
        aria-busy={busy}
        className="min-w-0 space-y-4"
      >
        <ProductWizardSteps
          steps={steps}
          step={step}
          completedStep={persistedWizard?.completed_step ?? 0}
          maximumStep={maxStep}
          busy={busy}
          hasRecord={Boolean(layout)}
          label={t("stepLabel")}
          stepLabel={(number) => t(`step${number}`)}
          onSelect={editStep}
        />
        {layout?.wizard.has_pending_edit && (
          <p className="bg-brand-50 text-brand-800 dark:bg-brand-500/10 dark:text-brand-200 rounded-xl px-4 py-3 text-sm">
            {t("pendingEdit", {
              status: t(layout.is_active ? "active" : "inactive"),
            })}
          </p>
        )}
        {(failure || (step === 4 && fieldMessages.length > 0)) && (
          <div
            role="alert"
            className="bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-300 rounded-xl p-4 text-sm"
          >
            <p>{failure || t("reviewIncomplete")}</p>
            {fieldMessages.some((message) => message !== failure) && (
              <ul className="mt-1 list-disc ps-5">
                {fieldMessages
                  .filter((message) => message !== failure)
                  .map((message) => (
                    <li key={message}>{message}</li>
                  ))}
              </ul>
            )}
            {step === 4 && Object.keys(warnings).length > 0 && (
              <button
                type="button"
                className="mt-2 font-semibold underline"
                onClick={() => editStep(fieldStep(Object.keys(warnings)[0]))}
              >
                {t("fixStep")}
              </button>
            )}
          </div>
        )}
        <fieldset disabled={busy} className="min-w-0 space-y-4">
          {step === 1 && crops && (
            <BasicDetailsStep
              options={options}
              saved={basic ?? null}
              crops={crops}
              busy={busy}
            />
          )}
          {step === 2 && (
            <>
              {definition &&
                savedConfiguration?.configuration_version !==
                  definition.configuration_version && (
                  <p
                    role="alert"
                    className="bg-warning-50 text-warning-800 dark:bg-warning-950 dark:text-warning-200 rounded-lg p-4 text-sm"
                  >
                    {t("configurationVersionChanged")}
                  </p>
                )}
              {definition ? (
                <ConfigurationStep definition={definition} busy={busy} />
              ) : (
                <p
                  role="alert"
                  className="bg-warning-50 text-warning-800 dark:bg-warning-950 dark:text-warning-200 rounded-lg p-4 text-sm"
                >
                  {t("configuration.unavailable")}
                </p>
              )}
            </>
          )}
          {step === 3 && <TranslationsStep options={options} busy={busy} />}
          {step === 4 && review && (
            <FieldLayoutReview
              sections={review}
              options={options}
              status={
                review.basic_details.requested_is_active ? "active" : "inactive"
              }
              onEdit={editStep}
              busy={busy}
            />
          )}
        </fieldset>
        <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div>
            {step > 1 && (
              <button
                type="button"
                disabled={busy}
                className={outline}
                onClick={() => editStep(steps[step - 2])}
              >
                <ArrowRightIcon
                  className="size-4 rotate-180 rtl:rotate-0"
                  aria-hidden="true"
                />
                {t("previous")}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className={outline}
              onClick={() => goTo(listPath)}
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={
                busy ||
                (step === 2 && !definition) ||
                (step === 4 && !review?.wizard.can_finalize)
              }
              className="bg-brand-500 hover:bg-brand-600 inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {step === 4 && (
                <CheckLineIcon className="size-4" aria-hidden="true" />
              )}
              {t(
                busy
                  ? "saving"
                  : step < 4
                    ? "next"
                    : editing
                      ? "update"
                      : "save",
              )}
              {step < 4 && (
                <ArrowRightIcon
                  className="size-4 rtl:rotate-180"
                  aria-hidden="true"
                />
              )}
            </button>
          </div>
        </footer>
      </form>
      {leaveTo && (
        <SeedConfirmDialog
          title={t("leaveTitle")}
          description={t("leaveDescription")}
          confirmLabel={t("leave")}
          onClose={() => setLeaveTo(null)}
          onConfirm={() => {
            form.reset();
            setLeaveTo(null);
            router.push(leaveTo);
          }}
        />
      )}
    </FormProvider>
  );
}
