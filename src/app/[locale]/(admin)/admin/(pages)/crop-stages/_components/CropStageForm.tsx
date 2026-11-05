"use client";

import { useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { useRouter } from "@/i18n/navigation";
import { languages } from "@/i18n/languages";
import { saveCropStage } from "@/actions/admin/cropStages";
import ComponentCard from "@/components/admin/common/ComponentCard";
import {
  requiredStageLocales,
  type CropStage,
  type CropStageCropOption,
  type CropStageFormValues,
} from "@/types/admin/cropStage";
import CropStageBasicFields from "./CropStageBasicFields";
import CropStageTranslations from "./CropStageTranslations";
import CropStageSettings from "./CropStageSettings";

export default function CropStageForm({
  stage: initialStage,
  crops,
}: {
  stage: CropStage | null;
  crops: CropStageCropOption[];
}) {
  const t = useTranslations("cropStages");
  const router = useRouter();
  const saving = useRef(false);
  const persistedId = useRef(initialStage?.id ?? null);
  const [stage, setStage] = useState(initialStage);
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState("");
  const locales = [
    ...new Set([
      ...languages.map(({ id }) => id),
      ...Object.keys(stage?.translations ?? {}),
    ]),
  ];
  const form = useForm<CropStageFormValues>({
    defaultValues: {
      crop_id: initialStage ? String(initialStage.crop_id) : "",
      code: initialStage?.code ?? "",
      sequence: initialStage ? String(initialStage.sequence) : "",
      is_active: initialStage?.is_active ?? false,
      translations: Object.fromEntries(
        locales.map((locale) => [
          locale,
          {
            name: initialStage?.translations[locale]?.name ?? "",
            description: initialStage?.translations[locale]?.description ?? "",
          },
        ]),
      ),
    },
    mode: "onTouched",
  });
  const {
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { isSubmitting },
  } = form;
  const busy = pending || isSubmitting;
  function submit(values: CropStageFormValues) {
    if (saving.current) return;
    saving.current = true;
    setFailure("");
    clearErrors();
    startTransition(async () => {
      try {
        const translations = Object.fromEntries(
          languages
            .filter(
              ({ id }) =>
                requiredStageLocales.some((required) => required === id) ||
                !!stage?.translations[id] ||
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
        const result = await saveCropStage(
          persistedId.current,
          {
            crop_id: Number(values.crop_id),
            code: values.code.trim(),
            sequence: Number(values.sequence),
            translations,
          },
          values.is_active,
        );
        if (result.data) {
          persistedId.current = result.data.id;
          setStage(result.data);
        }
        if (!result.success || !result.data) {
          for (const [field, messages] of Object.entries(result.errors ?? {})) {
            if (!messages[0]) continue;
            if (
              field === "crop_id" ||
              field === "code" ||
              field === "sequence" ||
              field === "is_active"
            )
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
        if (!initialStage) {
          reset({
            crop_id: "",
            code: "",
            sequence: "",
            is_active: false,
            translations: Object.fromEntries(
              languages.map(({ id }) => [id, { name: "", description: "" }]),
            ),
          });
          persistedId.current = null;
          setStage(null);
        } else reset({ ...values, is_active: result.data.is_active });
        toast.success(result.message || t("feedback.saved"));
        router.push("/admin/crop-stages");
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
          <CropStageBasicFields form={form} stage={stage} crops={crops} />
          <ComponentCard
            title={t("translations.title")}
            className="shadow-theme-xs rounded-xl [&>div:first-child>h3]:text-xl [&>div:first-child>h3]:font-semibold"
          >
            <CropStageTranslations
              form={form}
              locales={locales}
              savedLocales={Object.keys(stage?.translations ?? {})}
            />
          </ComponentCard>
        </div>
        <CropStageSettings form={form} busy={busy} />
      </fieldset>
      <div className="flex flex-wrap justify-end gap-3 py-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (!saving.current) router.push("/admin/crop-stages");
          }}
          className="focus-visible:outline-brand-500 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus-visible:outline-2 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          disabled={busy || (!stage && !crops.length)}
          className="bg-brand-600 hover:bg-brand-700 focus-visible:outline-brand-500 rounded-lg px-6 py-3 text-sm font-semibold text-white focus-visible:outline-2 disabled:opacity-50"
        >
          {busy
            ? t("saving")
            : initialStage
              ? t("form.update")
              : t("form.save")}
        </button>
      </div>
    </form>
  );
}
