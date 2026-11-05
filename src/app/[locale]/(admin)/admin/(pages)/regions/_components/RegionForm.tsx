"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { saveRegion } from "@/actions/admin/regions";
import { useRouter } from "@/i18n/navigation";
import { languages } from "@/i18n/languages";
import type { Region, RegionFormValues } from "@/types/admin/region";
import RegionInformationFields from "./RegionInformationFields";
import RegionLocationFields from "./RegionLocationFields";
import RegionNameFields from "./RegionNameFields";

interface RegionFormProps {
  region?: Region;
}

export default function RegionForm({ region }: RegionFormProps) {
  const t = useTranslations("regions");
  const router = useRouter();
  const pending = useRef(false);
  const [submitError, setSubmitError] = useState("");
  const form = useForm<RegionFormValues>({
    defaultValues: {
      region_type: region?.region_type ?? "",
      parent_id: region?.parent_id == null ? "" : String(region.parent_id),
      code: region?.code ?? "",
      latitude: region?.latitude ?? "",
      longitude: region?.longitude ?? "",
      is_active: region?.is_active === false ? "0" : "1",
      translations: Object.fromEntries(
        languages.map(({ id }) => [
          id,
          { name: region?.translations?.[id]?.name ?? "" },
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
  const busy = isSubmitting;

  async function submit(values: RegionFormValues) {
    if (pending.current || !values.region_type) return;
    pending.current = true;
    setSubmitError("");
    try {
      const result = await saveRegion(region?.id ?? null, {
        region_type: values.region_type,
        parent_id:
          values.region_type === "country" ? null : Number(values.parent_id),
        code: values.code || null,
        latitude: values.latitude || null,
        longitude: values.longitude || null,
        is_active: values.is_active === "1",
        translations: Object.fromEntries(
          languages.map(({ id }) => [
            id,
            { name: values.translations[id].name },
          ]),
        ),
      });
      if (!result.success) {
        for (const [field, messages] of Object.entries(result.errors ?? {})) {
          if (!messages.length) continue;
          switch (field) {
            case "region_type":
            case "parent_id":
            case "code":
            case "latitude":
            case "longitude":
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
              }
          }
        }
        setSubmitError(result.message || t("feedback.saveFailed"));
        return;
      }
      // The create page is preserved across navigations by Cache Components.
      if (!region) reset();
      toast.success(result.message || t("feedback.saved"));
      router.push("/admin/regions");
    } catch {
      setSubmitError(t("feedback.saveFailed"));
    } finally {
      pending.current = false;
    }
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
      {submitError && (
        <p
          role="alert"
          className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-950 dark:text-error-300 rounded-xl border p-4 text-sm"
        >
          {submitError}
        </p>
      )}
      <fieldset
        disabled={busy}
        className="min-w-0 space-y-5 disabled:opacity-70"
      >
        <legend className="sr-only">{t("form.informationTitle")}</legend>
        <RegionInformationFields form={form} region={region} />
        <RegionLocationFields form={form} />
        <RegionNameFields form={form}>
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5 dark:border-gray-800">
            <button
              type="button"
              disabled={busy}
              onClick={() => router.push("/admin/regions")}
              className="border-brand-200 text-brand-600 hover:bg-brand-50 focus-visible:outline-brand-500 dark:text-brand-400 rounded-lg border px-6 py-3 text-sm font-medium focus-visible:outline-2 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              {t("form.cancel")}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="bg-brand-500 hover:bg-brand-600 focus-visible:outline-brand-500 dark:bg-brand-500 dark:hover:bg-brand-400 rounded-lg px-6 py-3 text-sm font-medium text-white focus-visible:outline-2 disabled:opacity-50"
            >
              {busy
                ? t("form.saving")
                : region
                  ? t("form.update")
                  : t("form.save")}
            </button>
          </div>
        </RegionNameFields>
      </fieldset>
    </form>
  );
}
