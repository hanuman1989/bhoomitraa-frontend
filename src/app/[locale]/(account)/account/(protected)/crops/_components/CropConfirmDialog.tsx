"use client";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Description,
} from "@headlessui/react";
import { useTranslations } from "next-intl";
import { cropButton, cropDanger, cropPrimary } from "./CropUi";
export default function CropConfirmDialog({
  title,
  description,
  busy,
  onClose,
  onConfirm,
  confirmLabel,
  alternativeLabel,
  onAlternative,
  cancelLabel,
  danger = false,
}: {
  title: string;
  description: string;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  alternativeLabel?: string;
  onAlternative?: () => void;
  cancelLabel?: string;
  /** Red confirm button for permanent deletions. */
  danger?: boolean;
}) {
  const t = useTranslations("farmerCrops");
  return (
    <Dialog
      open
      onClose={() => {
        if (!busy) onClose();
      }}
      className="relative z-99999"
    >
      <DialogBackdrop className="fixed inset-0 bg-gray-950/45 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-center justify-center p-5">
        <DialogPanel
          className="shadow-theme-xl w-full max-w-lg rounded-2xl bg-white p-6 dark:bg-gray-900"
          aria-busy={busy}
        >
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          <Description className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            {description}
          </Description>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              data-autofocus
              disabled={busy}
              onClick={onClose}
              className={cropButton}
            >
              {cancelLabel ?? t("cancel")}
            </button>
            {onAlternative && (
              <button
                type="button"
                disabled={busy}
                className={cropButton}
                onClick={onAlternative}
              >
                {alternativeLabel}
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              className={danger ? cropDanger : cropPrimary}
              onClick={onConfirm}
            >
              {busy ? t("saving") : confirmLabel}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
