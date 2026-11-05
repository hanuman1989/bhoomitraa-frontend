"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { Link, useRouter } from "@/i18n/navigation";
import KnowledgeSourceSection from "./KnowledgeSourceSection";
import KnowledgeSourceSummary from "./KnowledgeSourceSummary";
import KnowledgeSourceVerification from "./KnowledgeSourceVerification";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import { DocsIcon } from "@/icons";
import {
  saveKnowledgeSource,
  uploadKnowledgeSourceAttachment,
} from "@/actions/admin/knowledgeSources";
import {
  identifierTypes,
  sourceTypes,
  type KnowledgeSource,
  type KnowledgeSourceFormValues,
} from "@/types/admin/knowledgeSource";
import KnowledgeSourceAttachments from "./KnowledgeSourceAttachments";

const control =
  "w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 aria-invalid:border-error-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

function Field({
  name,
  label,
  required,
  error,
  help,
  children,
}: {
  name: string;
  label: string;
  required?: boolean;
  error?: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={name}>
        {label}
        {required && (
          <span aria-hidden="true" className="text-error-500">
            {" "}
            *
          </span>
        )}
      </Label>
      {children}
      <p
        id={`${name}-help`}
        className="mt-1 text-xs text-gray-500 dark:text-gray-400"
      >
        {help}
      </p>
      <p
        id={`${name}-error`}
        role="alert"
        className="text-error-600 dark:text-error-400 mt-1 text-xs"
      >
        {error}
      </p>
    </div>
  );
}

export default function KnowledgeSourceForm({
  source: initialSource,
  canReview,
  maxYear,
  readOnly = false,
}: {
  source: KnowledgeSource | null;
  canReview: boolean;
  maxYear: number;
  readOnly?: boolean;
}) {
  const t = useTranslations("knowledgeSources");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [savedSource, setSavedSource] = useState<KnowledgeSource | null>(null);
  const source = savedSource ?? initialSource;
  const [files, setFiles] = useState<File[]>([]);
  const [attachmentVersion, setAttachmentVersion] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [failure, setFailure] = useState("");
  const {
    register,
    handleSubmit,
    setError,
    reset,
    control: formControl,
    getValues,
    formState: { errors },
  } = useForm<KnowledgeSourceFormValues>({
    defaultValues: {
      title: source?.title ?? "",
      publisher: source?.publisher ?? "",
      source_type: source?.source_type ?? "",
      language: source?.language ?? "",
      source_url: source?.source_url ?? "",
      published_at: source?.published_at ?? "",
      publication_year: source?.publication_year?.toString() ?? "",
      identifier_type: source?.identifier_type ?? "",
      reference_identifier: source?.reference_identifier ?? "",
      description: source?.description ?? "",
      license_notes: source?.license_notes ?? "",
    },
  });
  const description = useWatch({ control: formControl, name: "description" });
  const license = useWatch({ control: formControl, name: "license_notes" });
  const required = {
    required: t("validation.required"),
    validate: (value: string) => !!value.trim() || t("validation.required"),
  };
  const max = (count: number) => ({
    value: count,
    message: t("validation.max", { count }),
  });
  const accessibility = (name: keyof KnowledgeSourceFormValues) => ({
    id: name,
    "aria-invalid": !!errors[name],
    "aria-describedby": `${name}-help ${name}-error`,
  });

  async function upload(id: number, selected: File[]) {
    setUploadError("");
    for (const [index, file] of selected.entries()) {
      setUploadStatus(
        t("attachments.uploading", {
          current: index + 1,
          total: selected.length,
          name: file.name,
        }),
      );
      try {
        const formData = new FormData();
        formData.append("attachments[]", file);
        const result = await uploadKnowledgeSourceAttachment(id, formData);
        if (!result.success || !result.data) {
          const backendErrors = Object.values(result.errors ?? {})
            .flat()
            .join(" ");
          const message = t("attachments.partialFailure", {
            message:
              backendErrors || result.message || t("attachments.uploadFailed"),
          });
          setUploadError(message);
          setUploadStatus("");
          toast.error(message);
          return false;
        }
        const uploaded = result.data;
        setFiles((current) =>
          current.filter((candidate) => candidate !== file),
        );
        setSavedSource((current) => {
          const saved = current ?? initialSource;
          return saved
            ? {
                ...saved,
                attachments: [...saved.attachments, ...uploaded],
                verification_status: "pending",
                is_active: false,
                verifier: null,
                verified_by: null,
                verified_at: null,
                last_checked_at: null,
                next_review_at: null,
                review_notes: null,
                rejection_reason: null,
              }
            : saved;
        });
      } catch {
        const message = t("attachments.partialFailure", {
          message: t("attachments.uploadFailed"),
        });
        setUploadError(message);
        setUploadStatus("");
        toast.error(message);
        return false;
      }
    }
    setUploadStatus("");
    if (selected.length) toast.success(t("attachments.uploaded"));
    return true;
  }

  function finishSave() {
    if (!initialSource) {
      // Clear the preserved create page only after metadata and uploads succeed.
      // Failed uploads must retain their source ID and files for a safe retry.
      reset();
      setSavedSource(null);
      setFiles([]);
      setAttachmentVersion((version) => version + 1);
      setUploadError("");
      setUploadStatus("");
      setFailure("");
    }
    router.push("/admin/knowledge-sources");
  }

  function submit(values: KnowledgeSourceFormValues) {
    if (pending || readOnly || values.source_type === "") return;
    const sourceType = values.source_type;
    setFailure("");
    startTransition(async () => {
      try {
        const result = await saveKnowledgeSource(source?.id ?? null, {
          title: values.title,
          publisher: values.publisher,
          source_type: sourceType,
          language: values.language || null,
          source_url: values.source_url || null,
          published_at: values.published_at || null,
          publication_year: values.publication_year
            ? Number(values.publication_year)
            : null,
          identifier_type: values.identifier_type || null,
          reference_identifier: values.reference_identifier || null,
          description: values.description || null,
          license_notes: values.license_notes || null,
        });
        if (!result.success || !result.data) {
          for (const field of [
            "title",
            "publisher",
            "source_type",
            "language",
            "source_url",
            "published_at",
            "publication_year",
            "identifier_type",
            "reference_identifier",
            "description",
            "license_notes",
          ] as const) {
            if (result.errors?.[field]?.[0])
              setError(field, {
                type: "server",
                message: result.errors[field][0],
              });
          }
          setFailure(result.message || t("saveFailed"));
          toast.error(result.message || t("saveFailed"));
          return;
        }
        setSavedSource(result.data);
        toast.success(result.message || t("saved"));
        if (await upload(result.data.id, files)) finishSave();
      } catch {
        setFailure(t("saveFailed"));
        toast.error(t("saveFailed"));
      }
    });
  }

  function retry() {
    if (!source || pending) return;
    startTransition(async () => {
      if (await upload(source.id, files)) finishSave();
    });
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate aria-busy={pending}>
      <div className="mb-5 flex flex-wrap items-center justify-end gap-3">
        {pending ? (
          <button
            type="button"
            disabled
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm opacity-50"
          >
            {t("cancel")}
          </button>
        ) : (
          <Link
            href="/admin/knowledge-sources"
            className="border-brand-300 text-brand-600 hover:bg-brand-50 dark:text-brand-300 rounded-lg border px-5 py-2.5 text-sm font-medium dark:border-gray-700 dark:hover:bg-gray-800"
          >
            {readOnly ? t("back") : t("cancel")}
          </Link>
        )}
        {readOnly && source ? (
          <Link
            href={`/admin/knowledge-sources/${source.id}/edit`}
            className="bg-brand-600 hover:bg-brand-700 rounded-lg px-5 py-2.5 text-sm font-medium text-white"
          >
            {t("actions.edit")}
          </Link>
        ) : (
          <button
            type="submit"
            disabled={pending}
            className="bg-brand-600 hover:bg-brand-700 focus-visible:outline-brand-500 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white focus-visible:outline-2 disabled:opacity-50"
          >
            <DocsIcon aria-hidden="true" className="size-4" />
            {pending ? t("saving") : t("save")}
          </button>
        )}
      </div>
      {failure && (
        <p
          role="alert"
          className="bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-300 mb-4 rounded-lg p-4 text-sm"
        >
          {failure}
        </p>
      )}
      <div className="grid items-start gap-5 2xl:grid-cols-4">
        <div className="min-w-0 space-y-5 2xl:col-span-3">
          <fieldset
            disabled={pending || readOnly}
            className="grid min-w-0 gap-5 disabled:opacity-80 lg:grid-cols-2"
          >
            <KnowledgeSourceSection
              title={t("sections.basic")}
              desc={t("sections.basicHelp")}
              kind="basic"
            >
              <Field
                name="title"
                label={t("fields.title")}
                required
                error={errors.title?.message}
                help={t("help.title")}
              >
                <Input
                  {...accessibility("title")}
                  {...register("title", { ...required, maxLength: max(500) })}
                  aria-required
                  error={!!errors.title}
                  placeholder={t("placeholders.title")}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  name="publisher"
                  label={t("fields.publisher")}
                  required
                  error={errors.publisher?.message}
                  help={t("help.publisher")}
                >
                  <Input
                    {...accessibility("publisher")}
                    {...register("publisher", {
                      ...required,
                      maxLength: max(255),
                    })}
                    aria-required
                    error={!!errors.publisher}
                    placeholder={t("placeholders.publisher")}
                  />
                </Field>
                <Field
                  name="source_type"
                  label={t("fields.source_type")}
                  required
                  error={errors.source_type?.message}
                  help={t("help.source_type")}
                >
                  <select
                    {...accessibility("source_type")}
                    {...register("source_type", {
                      required: t("validation.required"),
                    })}
                    aria-required
                    className={control}
                  >
                    <option value="">{t("select")}</option>
                    {sourceTypes.map((type) => (
                      <option key={type} value={type}>
                        {t(`types.${type}`)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field
                name="language"
                label={t("fields.language")}
                error={errors.language?.message}
                help={t("help.language")}
              >
                <select
                  {...accessibility("language")}
                  {...register("language")}
                  className={control}
                >
                  <option value="">{t("select")}</option>
                  <option value="en">{t("languages.en")}</option>
                  <option value="hi">{t("languages.hi")}</option>
                </select>
              </Field>
            </KnowledgeSourceSection>
            <KnowledgeSourceSection
              title={t("sections.publication")}
              desc={t("sections.publicationHelp")}
              kind="publication"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  name="published_at"
                  label={t("fields.published_at")}
                  error={errors.published_at?.message}
                  help={t("help.published_at")}
                >
                  <Input
                    {...accessibility("published_at")}
                    type="date"
                    {...register("published_at", {
                      deps: ["publication_year"],
                    })}
                    error={!!errors.published_at}
                  />
                </Field>
                <Field
                  name="publication_year"
                  label={t("fields.publication_year")}
                  error={errors.publication_year?.message}
                  help={t("help.publication_year")}
                >
                  <Input
                    {...accessibility("publication_year")}
                    type="number"
                    min={1000}
                    max={maxYear}
                    step={1}
                    {...register("publication_year", {
                      validate: (value) =>
                        !value ||
                        (Number.isInteger(Number(value)) &&
                          Number(value) >= 1000 &&
                          Number(value) <= maxYear &&
                          (!getValues("published_at") ||
                            Number(value) ===
                              Number(getValues("published_at").slice(0, 4)))) ||
                        t("validation.year", { max: maxYear }),
                    })}
                    error={!!errors.publication_year}
                    placeholder={t("placeholders.year")}
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  name="identifier_type"
                  label={t("fields.identifier_type")}
                  error={errors.identifier_type?.message}
                >
                  <select
                    {...accessibility("identifier_type")}
                    {...register("identifier_type")}
                    className={control}
                  >
                    <option value="">{t("select")}</option>
                    {identifierTypes.map((type) => (
                      <option key={type} value={type}>
                        {t(`identifiers.${type}`)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  name="reference_identifier"
                  label={t("fields.reference_identifier")}
                  error={errors.reference_identifier?.message}
                  help={t("help.reference_identifier")}
                >
                  <Input
                    {...accessibility("reference_identifier")}
                    {...register("reference_identifier", {
                      maxLength: max(255),
                    })}
                    error={!!errors.reference_identifier}
                    placeholder={t("placeholders.reference")}
                  />
                </Field>
              </div>
              <Field
                name="source_url"
                label={t("fields.source_url")}
                error={errors.source_url?.message}
                help={t("help.source_url")}
              >
                <Input
                  {...accessibility("source_url")}
                  type="url"
                  {...register("source_url", {
                    maxLength: max(2048),
                    validate: (value) => {
                      if (!value) return true;
                      try {
                        const url = new URL(value);
                        return (
                          ["http:", "https:"].includes(url.protocol) ||
                          t("validation.url")
                        );
                      } catch {
                        return t("validation.url");
                      }
                    },
                  })}
                  error={!!errors.source_url}
                  placeholder="https://"
                />
                {readOnly &&
                  source?.source_url &&
                  /^https?:\/\//i.test(source.source_url) && (
                    <a
                      href={source.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 dark:text-brand-300 mt-2 inline-block text-sm underline"
                    >
                      {t("openSource")}
                    </a>
                  )}
              </Field>
            </KnowledgeSourceSection>
            <KnowledgeSourceSection
              title={t("sections.description")}
              desc={t("sections.descriptionHelp")}
              kind="description"
            >
              <Field
                name="description"
                label={t("fields.description")}
                error={errors.description?.message}
              >
                <textarea
                  {...accessibility("description")}
                  {...register("description", { maxLength: max(65535) })}
                  rows={4}
                  className={control}
                  placeholder={t("placeholders.description")}
                />
                <p className="text-end text-xs text-gray-500 dark:text-gray-400">
                  {t("characters", { count: description.length, max: 65535 })}
                </p>
              </Field>
              <Field
                name="license_notes"
                label={t("fields.license_notes")}
                error={errors.license_notes?.message}
                help={t("help.license_notes")}
              >
                <textarea
                  {...accessibility("license_notes")}
                  {...register("license_notes", { maxLength: max(65535) })}
                  rows={3}
                  className={control}
                  placeholder={t("placeholders.license")}
                />
                <p className="text-end text-xs text-gray-500 dark:text-gray-400">
                  {t("characters", { count: license.length, max: 65535 })}
                </p>
              </Field>
            </KnowledgeSourceSection>
            <KnowledgeSourceVerification source={source} />
          </fieldset>
          <KnowledgeSourceSection
            title={t("sections.attachments")}
            desc={t("sections.attachmentsHelp")}
            kind="attachments"
          >
            <KnowledgeSourceAttachments
              key={attachmentVersion}
              sourceId={source?.id}
              attachments={source?.attachments ?? []}
              files={files}
              onFilesChange={setFiles}
              busy={pending}
              readOnly={readOnly}
              uploadStatus={uploadStatus}
              uploadError={uploadError}
              onRetry={retry}
              onDeleted={(id) =>
                setSavedSource((current) => {
                  const saved = current ?? initialSource;
                  return saved
                    ? {
                        ...saved,
                        attachments: saved.attachments.filter(
                          (file) => file.id !== id,
                        ),
                        verification_status: "pending",
                        is_active: false,
                        verifier: null,
                        verified_at: null,
                        last_checked_at: null,
                        next_review_at: null,
                        review_notes: null,
                        rejection_reason: null,
                      }
                    : saved;
                })
              }
            />
          </KnowledgeSourceSection>
        </div>
        <KnowledgeSourceSummary
          source={source}
          canReview={canReview}
          pending={pending}
          onChanged={(updated) =>
            setSavedSource((current) => ({
              ...(current ?? source),
              ...updated,
            }))
          }
        />
      </div>
    </form>
  );
}
