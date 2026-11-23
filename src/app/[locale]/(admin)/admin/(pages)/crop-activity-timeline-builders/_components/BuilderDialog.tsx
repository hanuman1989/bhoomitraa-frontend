"use client";

import { useState, type FormEventHandler, type ReactNode } from "react";
import {
  Description,
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { useTranslations } from "next-intl";
import { AlertIcon, CloseLineIcon } from "@/icons";

export const buttonClass =
  "rounded-lg border border-gray-300 h-9 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800";
export const primaryClass =
  "bg-brand-600 hover:bg-brand-700 focus-visible:outline-brand-500 rounded-lg h-9 px-4 text-sm font-semibold text-white focus-visible:outline-2 disabled:opacity-50";

/**
 * Routes a Laravel 422 key to the builder form field that shows it: grouped
 * applicability/schedule controls, dynamic translation paths, or the field.
 */
export function errorTarget(key: string) {
  if (
    /^(variety_scope|season_scope|region_scope|crop_variety_ids|season_ids|region_ids|knowledge_source_ids)(\.|$)/.test(
      key,
    )
  )
    return "app";
  if (
    /^(schedule_type|schedule_basis|start_offset_days|end_offset_days)$/.test(
      key,
    )
  )
    return "schedule";
  if (/^smart_actions(\.|$)/.test(key)) return "smart_actions";
  return key;
}

/**
 * Sends each 422 message to `setField` (which returns true when it shows it)
 * and returns the message for the dialog-level alert and toast.
 */
export function applyServerErrors(
  result: { message: string; errors?: Record<string, string[]> },
  setField: (target: string, message: string) => boolean,
  fallback: string,
) {
  const general: string[] = [];
  for (const [key, messages] of Object.entries(result.errors ?? {})) {
    if (messages[0] && !setField(errorTarget(key), messages[0]))
      general.push(messages[0]);
  }
  return general[0] || result.message || fallback;
}

/** Shared modal shell: Escape/backdrop close, dirty-discard guard and footer. */
export default function BuilderDialog({
  title,
  description,
  onClose,
  onSubmit,
  submitLabel,
  busy = false,
  dirty = false,
  error,
  loading = false,
  wide = false,
  extraActions,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  submitLabel?: string;
  busy?: boolean;
  dirty?: boolean;
  error?: string;
  loading?: boolean;
  wide?: boolean;
  extraActions?: ReactNode;
  children?: ReactNode;
}) {
  const t = useTranslations("timelineBuilder");
  const [confirming, setConfirming] = useState(false);
  function requestClose() {
    if (busy) return;
    if (dirty && !confirming) setConfirming(true);
    else onClose();
  }
  return (
    <Dialog open onClose={requestClose} className="relative z-99999">
      <DialogBackdrop className="fixed inset-0 bg-gray-950/50 backdrop-blur-sm" />
      {/* Fixed header and footer; only the middle body scrolls. */}
      <div className="fixed inset-0 flex items-center justify-center p-4 max-sm:p-2">
        <DialogPanel
          aria-busy={busy || loading}
          className={`shadow-theme-xl flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-2xl bg-white max-sm:max-h-[calc(100dvh-1rem)] dark:bg-gray-900 ${wide ? "max-w-4xl" : "max-w-2xl"}`}
        >
          <form
            onSubmit={onSubmit}
            noValidate
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex shrink-0 items-start gap-3 border-b border-gray-200 px-6 py-4 max-sm:px-4 dark:border-gray-800">
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                  {title}
                </DialogTitle>
                {description && (
                  <Description className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {description}
                  </Description>
                )}
              </div>
              <button
                type="button"
                onClick={requestClose}
                disabled={busy}
                aria-label={t("close")}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
              >
                <CloseLineIcon aria-hidden="true" className="size-5" />
              </button>
            </div>
            {/* A plain div scrolls: fieldsets do not shrink reliably as flex
                items, which let the body overflow under the footer. */}
            <div className="custom-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-6 py-5 max-sm:px-4">
              <fieldset
                disabled={busy || loading}
                className="m-0 min-w-0 space-y-4 border-0 p-0"
              >
                {loading ? (
                  <p role="status" className="text-sm text-gray-500">
                    {t("loadingRecord")}
                  </p>
                ) : (
                  children
                )}
                {error && (
                  <p
                    role="alert"
                    className="bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-300 rounded-lg p-3 text-sm"
                  >
                    {error}
                  </p>
                )}
              </fieldset>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-gray-200 bg-white px-6 py-4 max-sm:px-4 dark:border-gray-800 dark:bg-gray-900">
              <button
                type="button"
                data-autofocus={!onSubmit || undefined}
                disabled={busy}
                onClick={requestClose}
                className={buttonClass}
              >
                {onSubmit ? t("cancel") : t("close")}
              </button>
              {extraActions}
              {onSubmit && (
                <button
                  type="submit"
                  disabled={busy || loading}
                  className={primaryClass}
                >
                  {busy ? t("saving") : (submitLabel ?? t("saveChanges"))}
                </button>
              )}
            </div>
          </form>
          {/* Nested confirmation: Escape or an outside click keeps editing,
              and only this dialog closes until the admin chooses Discard. */}
          <Dialog
            open={confirming}
            onClose={() => setConfirming(false)}
            role="alertdialog"
            className="relative z-999999"
          >
            <DialogBackdrop className="fixed inset-0 bg-gray-950/40" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <DialogPanel className="shadow-theme-xl w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900">
                <div className="flex items-start gap-4">
                  <span className="bg-warning-50 text-warning-600 dark:bg-warning-950 dark:text-warning-400 flex size-11 shrink-0 items-center justify-center rounded-full">
                    <AlertIcon aria-hidden="true" className="size-6" />
                  </span>
                  <div className="min-w-0">
                    <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                      {t("discardPrompt")}
                    </DialogTitle>
                    <Description className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {t("discardDescription")}
                    </Description>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    data-autofocus
                    className={buttonClass}
                    onClick={() => setConfirming(false)}
                  >
                    {t("keepEditing")}
                  </button>
                  <button
                    type="button"
                    className="bg-error-600 hover:bg-error-700 focus-visible:outline-error-500 h-9 rounded-lg px-4 text-sm font-semibold text-white focus-visible:outline-2"
                    onClick={onClose}
                  >
                    {t("discard")}
                  </button>
                </div>
              </DialogPanel>
            </div>
          </Dialog>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
