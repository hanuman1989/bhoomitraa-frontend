"use client";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Description,
} from "@headlessui/react";
import { useTranslations } from "next-intl";
export default function BoundaryConfirmDialog({
  title,
  description,
  onConfirm,
  onClose,
  confirmLabel,
  alternativeLabel,
  onAlternative,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  onClose: () => void;
  confirmLabel?: string;
  alternativeLabel?: string;
  onAlternative?: () => void;
}) {
  const t = useTranslations("farmerFarms");
  return (
    <Dialog open onClose={onClose} className="relative z-99999">
      <DialogBackdrop className="fixed inset-0 bg-gray-950/45" />
      <div className="fixed inset-0 flex items-center justify-center p-5">
        <DialogPanel className="shadow-theme-xl w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900">
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          <Description className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            {description}
          </Description>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              data-autofocus
              onClick={onClose}
              className="rounded-xl border border-gray-300 px-5 py-2.5 dark:border-gray-600"
            >
              {t("cancel")}
            </button>
            {onAlternative && (
              <button
                type="button"
                onClick={onAlternative}
                className="border-success-600 text-success-700 dark:text-success-300 rounded-xl border px-5 py-2.5 font-semibold"
              >
                {alternativeLabel}
              </button>
            )}
            <button
              type="button"
              onClick={onConfirm}
              className="bg-success-700 hover:bg-success-800 rounded-xl px-5 py-2.5 font-semibold text-white"
            >
              {confirmLabel ?? t("confirmAction")}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
