"use client";
import CropVarietyBasicFields from "./CropVarietyBasicFields";
import CropVarietySettings from "./CropVarietySettings";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { useRouter } from "@/i18n/navigation";
import { languages } from "@/i18n/languages";
import { saveCropVariety } from "@/actions/admin/cropVarieties";
import ComponentCard from "@/components/admin/common/ComponentCard";
import { CheckLineIcon } from "@/icons";
import type { Crop } from "@/types/admin/crop";
import type { KnowledgeSource } from "@/types/admin/knowledgeSource";
import type {
  CropVariety,
  CropVarietyFormValues,
  VarietyRelationPage,
} from "@/types/admin/cropVariety";
import CropVarietyTranslations from "./CropVarietyTranslations";

export default function CropVarietyForm({
  variety,
  cropOptions,
  sourceOptions,
  initialCrop,
  initialSource,
}: {
  variety: CropVariety | null;
  cropOptions: VarietyRelationPage;
  sourceOptions: VarietyRelationPage;
  initialCrop: Crop | null;
  initialSource: KnowledgeSource | null;
}) {
  const t = useTranslations("cropVarieties");
  const router = useRouter();
  const saving = useRef(false);
  const [failure, setFailure] = useState("");
  const locales = [
    ...new Set([
      ...languages.map(({ id }) => id),
      ...Object.keys(variety?.translations ?? {}),
    ]),
  ];
  const [formVersion, setFormVersion] = useState(0);
  const form = useForm<CropVarietyFormValues>({
    defaultValues: {
      crop_id: variety ? String(variety.crop_id) : "",
      slug: variety?.slug ?? "",
      variety_code: variety?.variety_code ?? "",
      maturity_days_min:
        variety?.maturity_days_min == null
          ? ""
          : String(variety.maturity_days_min),
      maturity_days_max:
        variety?.maturity_days_max == null
          ? ""
          : String(variety.maturity_days_max),
      source_id: variety?.source_id == null ? "" : String(variety.source_id),
      is_active: variety?.is_active ?? false,
      translations: Object.fromEntries(
        locales.map((locale) => [
          locale,
          {
            name: variety?.translations[locale]?.name ?? "",
            description: variety?.translations[locale]?.description ?? "",
            region_notes: variety?.translations[locale]?.region_notes ?? "",
          },
        ]),
      ),
    },
    mode: "onTouched",
  });
  const {
    handleSubmit,
    setError,
    reset,
    formState: { isSubmitting },
  } = form;
  async function submit(values: CropVarietyFormValues) {
    if (saving.current) return;
    saving.current = true;
    setFailure("");
    try {
      const result = await saveCropVariety(variety?.id ?? null, {
        crop_id: Number(values.crop_id),
        slug: values.slug.trim(),
        variety_code: values.variety_code.trim() || null,
        maturity_days_min:
          values.maturity_days_min === ""
            ? null
            : Number(values.maturity_days_min),
        maturity_days_max:
          values.maturity_days_max === ""
            ? null
            : Number(values.maturity_days_max),
        source_id: values.source_id === "" ? null : Number(values.source_id),
        is_active: values.is_active,
        translations: Object.fromEntries(
          locales
            .filter((locale) =>
              languages.some((language) => language.id === locale),
            )
            .map((locale) => [
              locale,
              {
                name: values.translations[locale].name.trim(),
                description:
                  values.translations[locale].description.trim() || null,
                region_notes:
                  values.translations[locale].region_notes.trim() || null,
              },
            ]),
        ),
      });
      if (!result.success || !result.data) {
        for (const [field, messages] of Object.entries(result.errors ?? {})) {
          if (!messages[0]) continue;
          switch (field) {
            case "crop_id":
            case "slug":
            case "variety_code":
            case "maturity_days_min":
            case "maturity_days_max":
            case "source_id":
            case "is_active":
              setError(field, { type: "server", message: messages[0] });
              break;
            default:
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
                if (field === `translations.${locale}.region_notes`)
                  setError(`translations.${locale}.region_notes`, {
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
      if (!variety) {
        reset();
        setFormVersion((version) => version + 1);
      } else {
        reset(values);
      }
      toast.success(result.message || t("feedback.saved"));
      router.push("/admin/crop-varieties");
    } catch {
      setFailure(t("feedback.saveFailed"));
      toast.error(t("feedback.saveFailed"));
    } finally {
      saving.current = false;
    }
  }
  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(submit)(event);
      }}
      noValidate
      aria-busy={isSubmitting}
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
        disabled={isSubmitting}
        className="grid min-w-0 items-start gap-5 disabled:opacity-70 xl:grid-cols-3"
      >
        <legend className="sr-only">{t("form.basic")}</legend>
        <div className="min-w-0 space-y-5 xl:col-span-2">
          <CropVarietyBasicFields
            form={form}
            cropOptions={cropOptions}
            initialCrop={initialCrop}
            formVersion={formVersion}
            isSubmitting={isSubmitting}
          />
          <ComponentCard
            title={t("translations.title")}
            desc={t("translations.help")}
            className="rounded-xl [&>div:first-child>h3]:text-xl [&>div:first-child>h3]:font-semibold"
          >
            <CropVarietyTranslations form={form} locales={locales} />
          </ComponentCard>
        </div>
        <CropVarietySettings
          form={form}
          sourceOptions={sourceOptions}
          initialSource={initialSource}
          formVersion={formVersion}
          isSubmitting={isSubmitting}
        />
      </fieldset>
      <div className="sticky bottom-0 z-9 flex justify-end gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => router.push("/admin/crop-varieties")}
          className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-800 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-success-700 hover:bg-success-800 focus-visible:outline-success-600 inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white focus-visible:outline-2 disabled:opacity-50"
        >
          <CheckLineIcon aria-hidden="true" className="size-5" />
          {isSubmitting
            ? t("saving")
            : variety
              ? t("form.update")
              : t("form.save")}
        </button>
      </div>
    </form>
  );
}
