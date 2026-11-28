"use client";

import { useEffect, useRef, useState } from "react";
import {
  FormProvider,
  useForm,
  useWatch,
  type FieldPath,
} from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { useRouter } from "@/i18n/navigation";
import { languages } from "@/i18n/languages";
import {
  finalizeSowingMethod,
  saveSowingMethodBasic,
  saveSowingMethodImages,
  saveSowingMethodTranslations,
} from "@/actions/admin/sowingMethods";
import ProductWizardSteps from "@/components/admin/common/ProductWizardSteps";
import { ArrowRightIcon, CheckLineIcon } from "@/icons";
import type { ActionResult, ApiValidationErrors } from "@/types/api";
import type { TimelineOptionPage } from "@/types/admin/cropStageTimeline";
import {
  cropScopes,
  establishmentTypes,
  machineryRequirements,
  methodLevels,
  requiredSowingMethodTranslationFields,
  sowingMethodPrimaryLocale,
  sowingMethodTranslationLimits,
  type MethodGalleryItem,
  type SowingMethod,
  type SowingMethodBasicInput,
  type SowingMethodFormValues,
  type SowingMethodOptions,
  type SowingMethodTranslation,
} from "@/types/admin/sowingMethod";
import SeedConfirmDialog from "../../seeds/_components/SeedConfirmDialog";
import MethodBasicStep from "./MethodBasicStep";
import MethodTranslationsStep from "./MethodTranslationsStep";
import MethodImagesStep from "./MethodImagesStep";
import MethodReview from "./MethodReview";

const steps = [1, 2, 3, 4] as const;
type Step = (typeof steps)[number];
const translationFields = Object.keys(
  sowingMethodTranslationLimits,
) as (keyof SowingMethodTranslation)[];
const outline =
  "inline-flex h-9 items-center gap-2 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800";

function defaults(method: SowingMethod | null): SowingMethodFormValues {
  return {
    code: method?.code ?? "",
    slug: method?.slug ?? "",
    establishment_type: method?.establishment_type ?? "direct_sowing",
    crop_scope: method?.crop_scope ?? "specific",
    crop_ids: method?.crops.map((crop) => crop.id) ?? [],
    supports_row_spacing: method?.supports_row_spacing ?? null,
    supports_plant_spacing: method?.supports_plant_spacing ?? null,
    supports_field_layout: method?.supports_field_layout ?? null,
    machinery_requirement: method?.machinery_requirement ?? "varies",
    labour_requirement: method?.labour_requirement ?? "varies",
    cost_level: method?.cost_level ?? "varies",
    sort_order: method?.sort_order ?? 0,
    is_active: method?.is_active ?? false,
    translations: Object.fromEntries(
      languages.map(({ id }) => {
        const content = method?.translations[id];
        return [
          id,
          Object.fromEntries(
            translationFields.map((field) => [field, content?.[field] ?? ""]),
          ),
        ];
      }),
    ) as SowingMethodFormValues["translations"],
  };
}

function savedGallery(method: SowingMethod | null): MethodGalleryItem[] {
  return (
    method?.images.map((image) => ({ token: `id:${image.id}`, image })) ?? []
  );
}

function fieldStep(field: string): Step {
  if (
    /^(images|image_order|retain_image_ids|remove_image_ids)(\.|$)/.test(field)
  )
    return 3;
  return field === "translations" || field.startsWith("translations.") ? 2 : 1;
}

function basicInput(values: SowingMethodFormValues): SowingMethodBasicInput {
  const { translations, is_active, ...settings } = values;
  void is_active;
  const { title, short_description } = translations[sowingMethodPrimaryLocale];
  return {
    ...settings,
    title,
    short_description,
    crop_ids: settings.crop_scope === "all" ? [] : settings.crop_ids,
  };
}

function basicFieldsChanged(
  draft: SowingMethodBasicInput,
  saved: SowingMethodBasicInput,
) {
  const savedCropIds = new Set(saved.crop_ids);
  return (
    draft.crop_ids.length !== saved.crop_ids.length ||
    draft.crop_ids.some((id) => !savedCropIds.has(id)) ||
    Object.entries(draft).some(
      ([field, value]) =>
        field !== "crop_ids" && value !== saved[field as keyof typeof saved],
    )
  );
}

export default function SowingMethodForm({
  initialMethod,
  options,
  crops,
}: {
  initialMethod: SowingMethod | null;
  options: SowingMethodOptions;
  crops: TimelineOptionPage;
}) {
  const t = useTranslations("sowingMethods");
  const router = useRouter();
  const [method, setMethod] = useState(initialMethod);
  const [step, setStep] = useState<Step>(1);
  const [completed, setCompleted] = useState(0);
  const [busy, setBusy] = useState(false);
  const [leave, setLeave] = useState(false);
  const [failure, setFailure] = useState("");
  const [serverErrors, setServerErrors] = useState<ApiValidationErrors>({});
  const [gallery, setGallery] = useState(() => savedGallery(initialMethod));
  const saving = useRef(false);
  const slugEditedRef = useRef(Boolean(initialMethod));
  const form = useForm<SowingMethodFormValues>({
    defaultValues: defaults(initialMethod),
  });
  const active = useWatch({ control: form.control, name: "is_active" });
  const { isDirty } = form.formState;
  const supportedLocaleIds = options.supported_locales.map(
    ({ value }) => value,
  );
  const writableLocales = languages.filter(({ id }) =>
    supportedLocaleIds.includes(id),
  );
  const imageOrder = gallery.map((item) => item.token);
  const savedImages = method?.images ?? [];
  const imagesChanged =
    imageOrder.length !== savedImages.length ||
    savedImages.some(({ id }, index) => imageOrder[index] !== `id:${id}`);
  const dirty = imagesChanged || isDirty;

  useEffect(() => {
    if (!dirty) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function goTo(next: Step) {
    if (saving.current) return;
    setFailure("");
    setServerErrors({});
    form.clearErrors();
    setStep(next);
  }

  function closeWizard(saved: SowingMethod | null) {
    const nextMethod = initialMethod ? saved : null;
    form.reset(defaults(nextMethod));
    setMethod(nextMethod);
    setGallery(savedGallery(nextMethod));
    slugEditedRef.current = Boolean(nextMethod);
    setStep(1);
    setCompleted(0);
    setFailure("");
    setServerErrors({});
    setLeave(false);
    router.push("/admin/sowing-methods");
  }

  function displayErrors(errors: ApiValidationErrors, currentStep: Step) {
    setServerErrors(errors);
    for (const [key, messages] of Object.entries(errors)) {
      const message = messages[0];
      if (!message || fieldStep(key) !== currentStep) continue;
      const field =
        key === "title" || key === "short_description"
          ? `translations.${sowingMethodPrimaryLocale}.${key}`
          : key.startsWith("crop_ids.")
            ? "crop_ids"
            : key;
      if (field.startsWith("translations.")) {
        const [, locale, translationField] = field.split(".");
        if (
          !writableLocales.some(({ id }) => id === locale) ||
          !translationFields.some((name) => name === translationField)
        ) {
          continue;
        }
      } else if (!Object.hasOwn(form.getValues(), field)) {
        continue;
      }
      form.setError(field as FieldPath<SowingMethodFormValues>, {
        type: "server",
        message,
      });
    }
  }

  async function submit() {
    if (saving.current) return;
    setFailure("");
    setServerErrors({});
    form.clearErrors();
    const input = form.getValues();
    const errors: ApiValidationErrors = {};
    const check = (field: string, valid: boolean, message: string) => {
      if (!valid && !errors[field]) errors[field] = [message];
    };
    if (step === 1) {
      const primary = input.translations[sowingMethodPrimaryLocale];
      const { title, short_description } = sowingMethodTranslationLimits;
      check("title", Boolean(primary.title.trim()), t("required"));
      check(
        "title",
        primary.title.length <= title,
        t("tooLong", { max: title }),
      );
      check(
        "short_description",
        !method?.is_active || Boolean(primary.short_description.trim()),
        t("required"),
      );
      check(
        "short_description",
        primary.short_description.length <= short_description,
        t("tooLong", { max: short_description }),
      );
      check(
        "code",
        input.code.length <= 40 &&
          /^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(input.code),
        t("invalidCode"),
      );
      check(
        "slug",
        input.slug.length <= 180 &&
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug),
        t("invalidSlug"),
      );
      check(
        "crop_ids",
        input.crop_scope === "all" ||
          (input.crop_ids.length > 0 &&
            input.crop_ids.length <= 1000 &&
            input.crop_ids.every((id) => Number.isSafeInteger(id) && id > 0) &&
            new Set(input.crop_ids).size === input.crop_ids.length),
        t("invalidCropCount"),
      );
      check(
        "sort_order",
        Number.isInteger(input.sort_order) &&
          input.sort_order >= 0 &&
          input.sort_order <= 65535,
        t("invalidSortOrder"),
      );
      const invalidOption = t("invalidOption");
      check(
        "establishment_type",
        establishmentTypes.includes(input.establishment_type),
        invalidOption,
      );
      check("crop_scope", cropScopes.includes(input.crop_scope), invalidOption);
      check(
        "machinery_requirement",
        machineryRequirements.includes(input.machinery_requirement),
        invalidOption,
      );
      check(
        "labour_requirement",
        methodLevels.includes(input.labour_requirement),
        invalidOption,
      );
      check(
        "cost_level",
        methodLevels.includes(input.cost_level),
        invalidOption,
      );
      for (const field of [
        "supports_row_spacing",
        "supports_plant_spacing",
        "supports_field_layout",
      ] as const) {
        check(
          field,
          input[field] === null || typeof input[field] === "boolean",
          invalidOption,
        );
      }
    } else if (step === 2) {
      if (
        writableLocales.length === 0 ||
        supportedLocaleIds.some(
          (id) => !writableLocales.some((language) => language.id === id),
        )
      ) {
        setFailure(t("translationConfigMismatch"));
        return;
      }
      for (const { id } of writableLocales) {
        for (const field of translationFields) {
          const value = input.translations[id][field];
          const max = sowingMethodTranslationLimits[field];
          check(
            `translations.${id}.${field}`,
            !requiredSowingMethodTranslationFields.includes(field) ||
              Boolean(value.trim()),
            t("required"),
          );
          check(
            `translations.${id}.${field}`,
            value.length <= max,
            t("tooLong", { max }),
          );
        }
      }
    } else if (step === 3) {
      check("images", gallery.length <= 8, t("imageCount"));
    }
    if (Object.keys(errors).length) {
      displayErrors(errors, step);
      return;
    }

    saving.current = true;
    setBusy(true);
    try {
      let result: ActionResult<SowingMethod> | undefined;
      if (step === 1) {
        const payload = basicInput(input);
        // Laravel revalidates active records on writes. An unchanged step should
        // let an admin reach the translations when a new locale is required.
        if (
          !method ||
          basicFieldsChanged(payload, basicInput(defaults(method)))
        ) {
          result = await saveSowingMethodBasic(method?.id ?? null, payload);
        }
      } else if (method && step === 2) {
        result = await saveSowingMethodTranslations(
          method.id,
          Object.fromEntries(
            writableLocales.map(({ id }) => [id, input.translations[id]]),
          ),
        );
      } else if (method && step === 3) {
        if (imagesChanged || method.readiness_errors.images) {
          const uploads = new FormData();
          for (const item of gallery) {
            if ("file" in item)
              uploads.append(`images[${item.token.slice(4)}]`, item.file);
          }
          result = await saveSowingMethodImages(
            method.id,
            {
              remove_image_ids: method.images
                .filter((image) => !imageOrder.includes(`id:${image.id}`))
                .map((image) => image.id),
              image_order: imageOrder,
            },
            uploads,
          );
        }
      } else if (method && step === 4) {
        result = await finalizeSowingMethod(method.id, input.is_active);
      }
      if (result && (!result.success || !result.data)) {
        const message = result.message || t("failed");
        setFailure(message);
        toast.error(message);
        if (result.errors) {
          const fields = Object.keys(result.errors);
          let next = step;
          if (step === 4 && fields.length) {
            next = fieldStep(fields[0]);
          } else if (
            step === 1 &&
            method?.is_active &&
            fields.length &&
            fields.every((field) => fieldStep(field) === 2)
          ) {
            next = 2;
          }
          setStep(next);
          displayErrors(result.errors, next);
        }
        return;
      }
      if (result?.data) {
        const saved = result.data;
        setMethod(saved);
        if (step === 1 || step === 2) {
          const persisted = defaults(saved);
          const draft = {
            ...(step === 1 ? persisted : input),
            is_active: input.is_active,
            translations:
              step === 2
                ? persisted.translations
                : {
                    ...input.translations,
                    [sowingMethodPrimaryLocale]: {
                      ...input.translations[sowingMethodPrimaryLocale],
                      title:
                        persisted.translations[sowingMethodPrimaryLocale].title,
                      short_description:
                        persisted.translations[sowingMethodPrimaryLocale]
                          .short_description,
                    },
                  },
          };
          form.reset(persisted);
          form.reset(draft, { keepDefaultValues: true });
          if (
            step === 2 &&
            basicFieldsChanged(basicInput(draft), basicInput(persisted))
          ) {
            setStep(1);
            return;
          }
        }
        if (step === 3) {
          setGallery(savedGallery(saved));
        }
        if (step === 4) {
          toast.success(result.message || t("saved"));
          closeWizard(saved);
          return;
        }
      }
      setCompleted((previous) => Math.max(previous, step));
      if (step < 4) setStep((step + 1) as Step);
    } catch {
      setFailure(t("failed"));
      toast.error(t("failed"));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        aria-busy={busy}
        className="min-w-0 space-y-4"
      >
        <ProductWizardSteps
          steps={steps}
          step={step}
          maximumStep={step}
          completedStep={completed}
          hasRecord={Boolean(method)}
          busy={busy}
          label={t("stepLabel")}
          stepLabel={(value) => t(`step${value}`)}
          onSelect={goTo}
        />
        {failure && (
          <div
            role="alert"
            className="bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-300 rounded-lg p-4 text-sm"
          >
            <p>{failure}</p>
            {Object.keys(serverErrors).length > 0 && (
              <ul className="mt-1 list-disc ps-5">
                {[...new Set(Object.values(serverErrors).flat())]
                  .filter((message) => message !== failure)
                  .map((message) => (
                    <li key={message}>{message}</li>
                  ))}
              </ul>
            )}
          </div>
        )}
        {method && !initialMethod && (
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {t("savedStepsHelp")}
          </p>
        )}
        <fieldset disabled={busy} className="min-w-0 space-y-4">
          {step === 1 && (
            <MethodBasicStep
              options={options}
              crops={crops}
              savedCrops={method?.crops ?? []}
              slugEditedRef={slugEditedRef}
              active={Boolean(method?.is_active)}
              busy={busy}
            />
          )}
          {step === 2 && (
            <MethodTranslationsStep supportedLocaleIds={supportedLocaleIds} />
          )}
          {step === 3 && (
            <MethodImagesStep
              gallery={gallery}
              setGallery={setGallery}
              title={
                method?.translations[sowingMethodPrimaryLocale]?.title ||
                method?.code ||
                t("title")
              }
              busy={busy}
              errors={Object.entries(serverErrors)
                .filter(([key]) => fieldStep(key) === 3)
                .flatMap(([, messages]) => messages)}
            />
          )}
          {step === 4 && method && (
            <MethodReview
              method={method}
              options={options}
              active={active}
              busy={busy}
              onEdit={goTo}
            />
          )}
        </fieldset>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div>
            {step > 1 && (
              <button
                type="button"
                disabled={busy}
                className={outline}
                onClick={() => goTo(steps[step - 2])}
              >
                <ArrowRightIcon
                  aria-hidden="true"
                  className="size-4 rotate-180 rtl:rotate-0"
                />
                {t("previous")}
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={busy}
              className={outline}
              onClick={() => (dirty ? setLeave(true) : closeWizard(method))}
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={busy || (step === 4 && !method?.is_complete)}
              className="bg-brand-500 hover:bg-brand-600 inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {step === 4 && !busy && (
                <CheckLineIcon aria-hidden="true" className="size-4" />
              )}
              {t(
                busy
                  ? "saving"
                  : step === 4
                    ? initialMethod
                      ? "update"
                      : "save"
                    : "next",
              )}
              {step < 4 && !busy && (
                <ArrowRightIcon
                  aria-hidden="true"
                  className="size-4 rtl:rotate-180"
                />
              )}
            </button>
          </div>
        </div>
      </form>
      {leave && (
        <SeedConfirmDialog
          title={t("leaveTitle")}
          description={t("leaveDescription")}
          confirmLabel={t("leave")}
          onClose={() => setLeave(false)}
          onConfirm={() => closeWizard(method)}
        />
      )}
    </FormProvider>
  );
}
