"use client";
import { useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Description,
} from "@headlessui/react";
import { useTranslations } from "next-intl";
import useFarmBoundary from "@/hooks/useFarmBoundary";
import FarmBoundaryEditor from "./FarmBoundaryEditor";
import BoundaryConfirmDialog from "./BoundaryConfirmDialog";
import type { AreaUnit, BoundaryDraft } from "@/types/account/farm";
export default function FarmBoundaryDialog({
  areaUnit,
  location,
  onClose,
  onConfirm,
}: {
  areaUnit: AreaUnit;
  location: string;
  onClose: () => void;
  onConfirm: (draft: BoundaryDraft) => void;
}) {
  const t = useTranslations("farmerFarms");
  const session = useFarmBoundary();
  const [discard, setDiscard] = useState(false);
  function close() {
    session.pause();
    if (session.points.length) setDiscard(true);
    else onClose();
  }
  return (
    <Dialog open onClose={close} className="relative z-9999">
      <DialogBackdrop className="fixed inset-0 bg-gray-950/40" />
      <div className="fixed inset-0 flex p-3 sm:p-5">
        <DialogPanel className="custom-scrollbar flex w-full flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-4 text-gray-950 dark:bg-gray-900 dark:text-gray-100">
          <DialogTitle className="text-2xl font-bold">
            {t("wizard.boundaryTitle")}
          </DialogTitle>
          <Description className="text-sm text-gray-600 dark:text-gray-300">
            {t("wizard.boundaryDescription")}
          </Description>
          <FarmBoundaryEditor
            session={session}
            areaUnit={areaUnit}
            location={location}
          />
          <div className="mt-auto flex justify-end gap-3 border-t border-gray-200 pt-3 dark:border-gray-700">
            <button
              type="button"
              onClick={close}
              className="border-success-600 text-success-700 dark:text-success-300 rounded-xl border px-6 py-3"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              disabled={!session.boundary || session.active}
              onClick={() => onConfirm(session.draft)}
              className="bg-success-700 rounded-xl px-6 py-3 font-semibold text-white disabled:opacity-40"
            >
              {t("continueToFarm")}
            </button>
          </div>
        </DialogPanel>
      </div>
      {discard && (
        <BoundaryConfirmDialog
          title={t("discardBoundaryTitle")}
          description={t("discardBoundaryDescription")}
          onConfirm={onClose}
          onClose={() => setDiscard(false)}
        />
      )}
    </Dialog>
  );
}
