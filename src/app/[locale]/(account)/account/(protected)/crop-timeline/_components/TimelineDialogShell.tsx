"use client";
import type { ReactNode } from "react";
import {
  Description,
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { useTranslations } from "next-intl";
import { CloseLineIcon } from "@/icons";

/**
 * Small dialog for timeline records and tools. It stacks above the timeline
 * dialog and becomes a bottom sheet on phones.
 */
export default function TimelineDialogShell({
  title,
  subtitle,
  icon,
  busy = false,
  onClose,
  footer,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  busy?: boolean;
  onClose: () => void;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  const t = useTranslations("farmerCropTimeline");
  return (
    <Dialog
      open
      onClose={() => {
        if (!busy) onClose();
      }}
      className="relative z-99999"
    >
      <DialogBackdrop className="fixed inset-0 bg-gray-950/45 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-end justify-center pt-10 sm:items-center sm:p-5">
        <DialogPanel
          aria-busy={busy}
          className="shadow-theme-xl flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white text-gray-950 sm:rounded-2xl dark:bg-gray-900 dark:text-white"
        >
          <header className="flex items-start gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
            {icon}
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
              {subtitle && (
                <Description className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  {subtitle}
                </Description>
              )}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              aria-label={t("close")}
              className="focus-visible:outline-success-600 -me-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 focus-visible:outline-2 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <CloseLineIcon aria-hidden="true" className="size-5" />
            </button>
          </header>
          {children && (
            <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {children}
            </div>
          )}
          {footer && (
            <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-700">
              {footer}
            </footer>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
