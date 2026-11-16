"use client";
import { useEffect, useState, startTransition } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { useTranslations } from "next-intl";
import { getFarmerCrop } from "@/actions/account/farm-crops";
import type { CropDetail } from "@/types/account/farmCrop";
import { CloseLineIcon } from "@/icons";
import CropReviewStep from "./CropReviewStep";
import { CropNotice, cropButton } from "./CropUi";
export default function CropDetailsDialog({
  id,
  section,
  onClose,
  onEdit,
}: {
  id: number;
  section?: "soil" | "fertilizer";
  onClose: () => void;
  onEdit: (step: number) => void;
}) {
  const t = useTranslations("farmerCrops");
  const [crop, setCrop] = useState<CropDetail | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    startTransition(async () => {
      setError("");
      const result = await getFarmerCrop(id);
      if (!active) return;
      if (result.success && result.data) setCrop(result.data);
      else setError(result.message);
    });
    return () => {
      active = false;
    };
  }, [id, attempt]);
  return (
    <Dialog open onClose={onClose} className="relative z-9999">
      <DialogBackdrop className="fixed inset-0 bg-gray-950/45 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-5">
        <DialogPanel className="shadow-theme-xl flex max-h-full w-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-white dark:bg-gray-900">
          <header className="flex items-center justify-between gap-3 border-b border-gray-200 p-5 dark:border-gray-700">
            <DialogTitle className="text-xl font-bold">
              {t("cropDetails")}
            </DialogTitle>
            <button
              type="button"
              aria-label={t("close")}
              onClick={onClose}
              className="rounded-lg p-2"
            >
              <CloseLineIcon className="size-5" />
            </button>
          </header>
          <div className="custom-scrollbar min-h-0 overflow-y-auto p-4 sm:p-6">
            {error ? (
              <CropNotice error>
                {error}{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => setAttempt((n) => n + 1)}
                >
                  {t("retry")}
                </button>
              </CropNotice>
            ) : crop ? (
              <CropReviewStep
                crop={crop}
                section={section}
                onEdit={
                  crop.status === "active" || crop.status === "draft"
                    ? onEdit
                    : undefined
                }
              />
            ) : (
              <p role="status" className="py-20 text-center">
                {t("loading")}
              </p>
            )}
          </div>
          <footer className="flex justify-end border-t border-gray-200 p-4 dark:border-gray-700">
            <button type="button" className={cropButton} onClick={onClose}>
              {t("close")}
            </button>
          </footer>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
