"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Description,
} from "@headlessui/react";
import { useTranslations } from "next-intl";

export default function SeedConfirmDialog({
  title,
  description,
  confirmLabel,
  busy = false,
  destructive = false,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("seeds");
  return (
    <Dialog
      open
      onClose={() => {
        if (!busy) onClose();
      }}
      className="relative z-99999"
    >
      <DialogBackdrop className="fixed inset-0 bg-gray-950/50 backdrop-blur-sm" />
      <div className="fixed inset-0 overflow-y-auto p-4">
        <div className="flex min-h-full items-center justify-center">
          <DialogPanel
            aria-busy={busy}
            className="shadow-theme-xl w-full max-w-lg space-y-5 rounded-2xl bg-white p-6 dark:bg-gray-900"
          >
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </DialogTitle>
            <Description className="text-sm leading-6 text-gray-600 dark:text-gray-400">
              {description}
            </Description>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                data-autofocus
                disabled={busy}
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={onConfirm}
                className={`rounded-lg px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 ${destructive ? "bg-error-600 hover:bg-error-700" : "bg-brand-500 hover:bg-brand-600"}`}
              >
                {busy ? t("saving") : confirmLabel}
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
