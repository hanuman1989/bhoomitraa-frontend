"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  FileIcon,
  UploadIcon,
  TrashBinIcon,
  InfoIcon,
  DownloadIcon,
} from "@/icons";
import { Link } from "@/i18n/navigation";
import type { KnowledgeSourceAttachment } from "@/types/admin/knowledgeSource";
import KnowledgeSourceConfirmDialog from "./KnowledgeSourceConfirmDialog";

export default function KnowledgeSourceAttachments({
  sourceId,
  attachments,
  files,
  onFilesChange,
  busy,
  readOnly,
  onDeleted,
  uploadStatus,
  uploadError,
  onRetry,
}: {
  sourceId?: number;
  attachments: KnowledgeSourceAttachment[];
  files: File[];
  onFilesChange: (files: File[]) => void;
  busy: boolean;
  readOnly: boolean;
  onDeleted: (id: number) => void;
  uploadStatus: string;
  uploadError: string;
  onRetry: () => void;
}) {
  const t = useTranslations("knowledgeSources");
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<KnowledgeSourceAttachment | null>(
    null,
  );
  function select(incoming: File[]) {
    if (busy) return;
    if (
      files.length + incoming.length > 10 ||
      incoming.some(
        (file) =>
          !/\.(pdf|docx|xlsx)$/i.test(file.name) ||
          file.size === 0 ||
          file.size > 10 * 1024 * 1024 ||
          file.name.length > 255,
      )
    ) {
      setError(t("attachments.invalidFiles"));
      return;
    }
    setError("");
    onFilesChange([...files, ...incoming]);
  }
  function size(bytes: number) {
    return t("attachments.size", { size: (bytes / 1024 / 1024).toFixed(2) });
  }
  return (
    <div id="attachments" className="scroll-mt-24 space-y-4">
      <div className={`grid gap-5 ${readOnly ? "" : "lg:grid-cols-2"}`}>
        {!readOnly && (
          <div>
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                select(Array.from(event.dataTransfer.files));
              }}
              className="border-brand-300 bg-brand-50/50 dark:border-brand-800 dark:bg-brand-950/30 rounded-xl border border-dashed p-5 text-center"
            >
              <UploadIcon
                aria-hidden="true"
                className="text-brand-500 mx-auto mb-3 size-10"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => input.current?.click()}
                className="text-brand-600 focus-visible:outline-brand-500 dark:text-brand-300 text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 disabled:opacity-50"
              >
                {t("attachments.browse")}
              </button>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {t("attachments.allowed")}
              </p>
              <input
                ref={input}
                type="file"
                multiple
                accept=".pdf,.docx,.xlsx"
                disabled={busy}
                aria-label={t("attachments.select")}
                className="sr-only"
                onChange={(event) => {
                  select(Array.from(event.target.files ?? []));
                  event.target.value = "";
                }}
              />
            </div>
            {files.length > 0 && (
              <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-2 py-2 text-sm"
                  >
                    <FileIcon
                      aria-hidden="true"
                      className="text-brand-500 size-5 shrink-0"
                    />
                    <span className="min-w-0 flex-1 break-all text-gray-700 dark:text-gray-300">
                      {file.name}
                      <span className="block text-xs text-gray-500">
                        {file.name.split(".").pop()?.toUpperCase()} ·{" "}
                        {size(file.size)}
                      </span>
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={t("attachments.remove", { name: file.name })}
                      onClick={() =>
                        onFilesChange(files.filter((_, i) => i !== index))
                      }
                      className="text-error-600 focus-visible:outline-error-500 dark:text-error-400 rounded p-1 focus-visible:outline-2 disabled:opacity-50"
                    >
                      <TrashBinIcon aria-hidden="true" className="size-5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
            {t("attachments.uploadedCount", { count: attachments.length })}
          </h3>
          {attachments.length === 0 ? (
            <p className="rounded-lg border border-gray-100 p-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
              {t("attachments.empty")}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-700">
              {attachments.map((attachment) => (
                <li
                  key={attachment.id}
                  className="flex flex-wrap items-center gap-2 px-3 py-2"
                >
                  <FileIcon
                    aria-hidden="true"
                    className="text-brand-500 size-5 shrink-0"
                  />
                  <span className="min-w-0 flex-1 text-sm break-all text-gray-700 dark:text-gray-300">
                    {attachment.file_name}
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      {attachment.file_type} · {size(attachment.file_size)}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    {sourceId && (
                      <Link
                        prefetch={false}
                        href={`/admin/knowledge-sources/${sourceId}/attachments/${attachment.id}`}
                        download
                        aria-label={t("attachments.download", {
                          name: attachment.file_name,
                        })}
                        className="text-brand-600 focus-visible:outline-brand-500 dark:text-brand-300 rounded p-1 focus-visible:outline-2"
                      >
                        <DownloadIcon aria-hidden="true" className="size-5" />
                      </Link>
                    )}
                    {!readOnly && (
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={t("attachments.delete", {
                          name: attachment.file_name,
                        })}
                        onClick={() => setDeleting(attachment)}
                        className="text-error-600 focus-visible:outline-error-500 dark:text-error-400 rounded p-1 focus-visible:outline-2 disabled:opacity-50"
                      >
                        <TrashBinIcon aria-hidden="true" className="size-5" />
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {(error || uploadError) && (
        <p
          role="alert"
          className="bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-300 rounded-lg p-3 text-sm"
        >
          {error || uploadError}
        </p>
      )}
      {uploadStatus && (
        <p role="status" className="text-brand-600 dark:text-brand-300 text-sm">
          {uploadStatus}
        </p>
      )}
      {!readOnly && sourceId && uploadError && files.length > 0 && (
        <button
          type="button"
          disabled={busy}
          onClick={onRetry}
          className="bg-brand-600 rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {t("attachments.retry")}
        </button>
      )}
      <p className="bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200 flex gap-2 rounded-lg p-3 text-xs">
        <InfoIcon aria-hidden="true" className="size-4 shrink-0" />
        {t("attachments.private")}
      </p>
      {deleting && sourceId && (
        <KnowledgeSourceConfirmDialog
          id={sourceId}
          attachmentId={deleting.id}
          title={deleting.file_name}
          operation="deleteAttachment"
          onClose={() => setDeleting(null)}
          onSuccess={() => onDeleted(deleting.id)}
        />
      )}
    </div>
  );
}
