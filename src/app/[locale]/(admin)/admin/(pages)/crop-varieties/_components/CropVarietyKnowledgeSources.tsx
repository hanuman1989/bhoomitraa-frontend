"use client";

import { useEffect, useId, useState } from "react";
import { useController, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { searchVarietyRelations } from "@/actions/admin/cropVarieties";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import type { KnowledgeSource } from "@/types/admin/knowledgeSource";
import type {
  CropVarietyFormValues,
  CropVarietySourceOption,
  VarietyRelation,
  VarietyRelationPage,
} from "@/types/admin/cropVariety";

interface SourceSearchResult {
  key: string;
  page?: VarietyRelationPage;
  error?: string;
}

function isKnowledgeSource(
  relation: VarietyRelation,
): relation is KnowledgeSource {
  return "verification_status" in relation;
}

function mergeSources(
  current: CropVarietySourceOption[],
  incoming: CropVarietySourceOption[],
) {
  const sources = new Map(current.map((source) => [source.id, source]));
  for (const source of incoming) {
    sources.set(source.id, { ...sources.get(source.id), ...source });
  }
  return [...sources.values()];
}

export default function CropVarietyKnowledgeSources({
  form,
  initialPage,
  initialSources,
  disabled,
}: {
  form: UseFormReturn<CropVarietyFormValues>;
  initialPage: VarietyRelationPage;
  initialSources: CropVarietySourceOption[];
  disabled: boolean;
}) {
  const t = useTranslations("cropVarieties");
  const id = useId();
  const active = useWatch({ control: form.control, name: "is_active" });
  const minimum = useWatch({
    control: form.control,
    name: "maturity_days_min",
  });
  const maximum = useWatch({
    control: form.control,
    name: "maturity_days_max",
  });
  const initialKey = JSON.stringify({ keyword: "", page: 1, attempt: 0 });
  const [search, setSearch] = useState({
    keyword: "",
    page: 1,
    attempt: 0,
  });
  const requestKey = JSON.stringify(search);
  const initialSourcesFromPage = initialPage.data.filter(isKnowledgeSource);
  const [knownSources, setKnownSources] = useState<CropVarietySourceOption[]>(
    () => mergeSources(initialSources, initialSourcesFromPage),
  );
  const [result, setResult] = useState<SourceSearchResult>({
    key: initialKey,
    page: { ...initialPage, data: initialSourcesFromPage },
  });
  const { field, fieldState } = useController({
    control: form.control,
    name: "knowledge_sources",
    rules: {
      validate: (selectedIds) =>
        !active ||
        (!minimum && !maximum) ||
        selectedIds.some((sourceId) =>
          knownSources.some(
            (source) =>
              source.id === sourceId &&
              source.is_active === true &&
              source.verification_status === "verified",
          ),
        ) ||
        t("validation.source"),
    },
  });
  const selectedIds = field.value;
  const current = result.key === requestKey ? result : undefined;

  useEffect(() => {
    if (result.key === requestKey) return;
    let activeRequest = true;
    const timer = setTimeout(async () => {
      try {
        const response = await searchVarietyRelations(
          "source",
          search.keyword,
          search.page,
          false,
        );
        if (!activeRequest) return;
        if (!response.success || !response.data) {
          setResult({
            key: requestKey,
            error: response.message || t("feedback.sourcesLoadFailed"),
          });
          return;
        }
        const sources = response.data.data.filter(isKnowledgeSource);
        const page = { ...response.data, data: sources };
        setKnownSources((previous) => mergeSources(previous, sources));
        setResult({ key: requestKey, page });
      } catch {
        if (activeRequest)
          setResult({
            key: requestKey,
            error: t("feedback.sourcesLoadFailed"),
          });
      }
    }, 250);
    return () => {
      activeRequest = false;
      clearTimeout(timer);
    };
  }, [
    requestKey,
    result.key,
    search.keyword,
    search.page,
    search.attempt,
    t,
  ]);

  const knownById = new Map(knownSources.map((source) => [source.id, source]));
  const visibleById = new Map<number, CropVarietySourceOption>();
  for (const source of current?.page?.data ?? []) {
    if (isKnowledgeSource(source)) visibleById.set(source.id, source);
  }
  for (const sourceId of selectedIds) {
    const source = knownById.get(sourceId);
    if (source) visibleById.set(sourceId, source);
  }
  const visibleSources = [...visibleById.values()];
  const errorId = `${id}-error`;
  const pagination = current?.page?.pagination;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={`${id}-search`}>{t("fields.knowledgeSources")}</Label>
        <span
          aria-live="polite"
          className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300"
        >
          {t("selectedSources", { count: selectedIds.length })}
        </span>
      </div>
      <Input
        id={`${id}-search`}
        type="search"
        value={search.keyword}
        onChange={(event) =>
          setSearch({ keyword: event.target.value, page: 1, attempt: 0 })
        }
        placeholder={t("relations.sourcesSearchPlaceholder")}
        aria-label={t("relations.sourcesSearchPlaceholder")}
        maxLength={150}
        disabled={disabled}
      />
      <div
        role="group"
        aria-label={t("fields.knowledgeSources")}
        aria-busy={!current}
        aria-describedby={fieldState.error ? errorId : undefined}
        className="custom-scrollbar max-h-64 space-y-1 overflow-y-auto overflow-x-hidden rounded-lg border border-gray-200 p-2 dark:border-gray-700"
      >
        {!current && (
          <p role="status" className="p-3 text-sm text-gray-500">
            {t("loading")}
          </p>
        )}
        {current?.error && (
          <div className="p-3">
            <p role="alert" className="text-error-600 text-sm">
              {current.error}
            </p>
            <button
              type="button"
              onClick={() =>
                setSearch((previous) => ({
                  ...previous,
                  attempt: previous.attempt + 1,
                }))
              }
              disabled={disabled}
              className="text-brand-600 mt-2 text-sm disabled:opacity-50"
            >
              {t("retry")}
            </button>
          </div>
        )}
        {current?.page?.data.length === 0 && (
          <p role="status" className="p-3 text-sm text-gray-500">
            {search.keyword.trim()
              ? t("relations.sourcesSearchEmpty")
              : t("relations.sourcesEmpty")}
          </p>
        )}
        {visibleSources.map((source, index) => {
          const checkboxId = `${id}-source-${source.id}`;
          return (
            <label
              key={source.id}
              htmlFor={checkboxId}
              className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 text-sm text-gray-800 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <input
                ref={index === 0 ? field.ref : undefined}
                id={checkboxId}
                type="checkbox"
                checked={selectedIds.includes(source.id)}
                onChange={(event) => {
                  const next = new Set(selectedIds);
                  if (event.target.checked) next.add(source.id);
                  else next.delete(source.id);
                  field.onChange([...next]);
                }}
                onBlur={field.onBlur}
                aria-invalid={!!fieldState.error}
                aria-describedby={fieldState.error ? errorId : undefined}
                disabled={disabled}
                className="mt-0.5 size-4 shrink-0 rounded border-gray-300 accent-brand-600 focus:ring-brand-500 dark:border-gray-600"
              />
              <span className="min-w-0 flex-1 whitespace-normal break-words">
                {source.title}
              </span>
            </label>
          );
        })}
        {pagination && pagination.last_page > 1 && (
          <div className="flex items-center justify-between gap-3 border-t border-gray-100 p-2 text-sm dark:border-gray-800">
            <button
              type="button"
              disabled={disabled || !current || pagination.current_page <= 1}
              onClick={() =>
                setSearch((previous) => ({
                  ...previous,
                  page: previous.page - 1,
                }))
              }
              className="text-brand-600 rounded px-2 py-1 disabled:opacity-40"
            >
              {t("previous")}
            </button>
            <span>
              {t("optionPage", {
                page: pagination.current_page,
                total: pagination.last_page,
              })}
            </span>
            <button
              type="button"
              disabled={
                disabled || !current || pagination.current_page >= pagination.last_page
              }
              onClick={() =>
                setSearch((previous) => ({
                  ...previous,
                  page: previous.page + 1,
                }))
              }
              className="text-brand-600 rounded px-2 py-1 disabled:opacity-40"
            >
              {t("next")}
            </button>
          </div>
        )}
      </div>
      {fieldState.error && (
        <p id={errorId} role="alert" className="text-error-600 dark:text-error-400 text-xs">
          {fieldState.error.message}
        </p>
      )}
    </div>
  );
}
