"use client";

import { useState } from "react";
import { useForm, type Path } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { languages } from "@/i18n/languages";
import type { CropActivityTemplate } from "@/types/admin/cropActivityTemplate";
import type { SaveSection, TranslationValues } from "./types";
import BuilderDialog, { applyServerErrors } from "./BuilderDialog";
import TranslationFields, {
  savedTranslations,
  translationPayload,
  visibleLocales,
} from "./TranslationFields";

type Values = { translations: TranslationValues };

function TranslationsForm({
  record,
  locales,
  onClose,
  onSave,
}: {
  record: CropActivityTemplate;
  locales: string[];
  onClose: () => void;
  onSave: SaveSection;
}) {
  const t = useTranslations("timelineBuilder");
  const [failure, setFailure] = useState("");
  const savedLocales = Object.keys(record.translations).filter((locale) =>
    languages.some(({ id }) => id === locale),
  );
  const form = useForm<Values>({
    defaultValues: { translations: savedTranslations(record.translations) },
    mode: "onTouched",
  });
  const {
    handleSubmit,
    setError,
    formState: { isSubmitting, isDirty },
  } = form;
  // Saved locales stay visible even when the admin has hidden them by default.
  const shown = visibleLocales([...locales, ...savedLocales]);
  return (
    <BuilderDialog
      title={t("edit.translations")}
      description={record.title ?? undefined}
      onClose={onClose}
      busy={isSubmitting}
      dirty={isDirty}
      error={failure}
      wide
      onSubmit={handleSubmit(async ({ translations }) => {
        setFailure("");
        const result = await onSave(record, {
          translations: translationPayload(translations),
        });
        if (result.success) return;
        const message = applyServerErrors(
          result,
          (target, text) => {
            if (!target.startsWith("translations.")) return false;
            setError(target as Path<Values>, { type: "server", message: text });
            return true;
          },
          t("feedback.saveFailed"),
        );
        setFailure(message);
        toast.error(message);
      })}
    >
      <TranslationFields
        form={form}
        locales={shown}
        savedLocales={savedLocales}
      />
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t("translations.preserved")}
      </p>
    </BuilderDialog>
  );
}

export default function TranslationsDialog({
  record,
  locales,
  onClose,
  onSave,
}: {
  record?: CropActivityTemplate;
  locales: string[];
  onClose: () => void;
  onSave: SaveSection;
}) {
  const t = useTranslations("timelineBuilder");
  return record ? (
    <TranslationsForm
      record={record}
      locales={locales}
      onClose={onClose}
      onSave={onSave}
    />
  ) : (
    <BuilderDialog title={t("edit.translations")} onClose={onClose} loading />
  );
}
