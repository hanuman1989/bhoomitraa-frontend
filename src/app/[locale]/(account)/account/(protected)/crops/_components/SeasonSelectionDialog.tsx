"use client";
import { useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Description,
} from "@headlessui/react";
import { useLocale, useTranslations } from "next-intl";
import type { CropSeason } from "@/types/account/farmCrop";
import { CalenderIcon, CloseLineIcon } from "@/icons";
import SeasonIcon from "@/components/common/SeasonIcon";
import { formatSeasonPeriod } from "@/lib/seasons/presentation";
import { CropChoice, cropButton, cropPrimary } from "./CropUi";
export default function SeasonSelectionDialog({
  seasons,
  selectedId,
  onClose,
  onConfirm,
}: {
  seasons: CropSeason[];
  selectedId: number | null;
  onClose: () => void;
  onConfirm: (season: CropSeason) => void;
}) {
  const t = useTranslations("farmerCrops");
  const locale = useLocale();
  const [selected, setSelected] = useState(selectedId);
  return (
    <Dialog open onClose={onClose} className="relative z-99999">
      <DialogBackdrop className="fixed inset-0 bg-gray-950/45 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="shadow-theme-xl flex max-h-full w-full max-w-xl flex-col rounded-3xl bg-white p-5 dark:bg-gray-900">
          <div className="flex items-start gap-3">
            <CalenderIcon className="text-success-600 size-10" />
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold">
                {t("otherSeason")}
              </DialogTitle>
              <Description className="mt-1 text-sm text-gray-500">
                {t("otherSeasonDescription")}
              </Description>
            </div>
            <button type="button" aria-label={t("close")} onClick={onClose}>
              <CloseLineIcon className="size-5" />
            </button>
          </div>
          <div className="custom-scrollbar my-5 min-h-0 space-y-2 overflow-y-auto">
            {seasons.map((season) => (
              <CropChoice
                key={season.id}
                selected={selected === season.id}
                onClick={() => setSelected(season.id)}
                className="flex w-full items-center gap-3 pe-9"
              >
                <SeasonIcon icon={season.icon} size={30} />
                <span className="min-w-0 flex-1">
                  <strong className="block">{season.name}</strong>
                  {formatSeasonPeriod(
                    season.start_month,
                    season.end_month,
                    locale,
                  ) && (
                    <span className="text-sm text-gray-500">
                      {formatSeasonPeriod(
                        season.start_month,
                        season.end_month,
                        locale,
                      )}
                    </span>
                  )}
                  {season.description && (
                    <span className="mt-1 block text-sm text-gray-500">
                      {season.description}
                    </span>
                  )}
                </span>
              </CropChoice>
            ))}
            {!seasons.length && <p>{t("noResults")}</p>}
          </div>
          <footer className="flex justify-end gap-3">
            <button type="button" className={cropButton} onClick={onClose}>
              {t("cancel")}
            </button>
            <button
              type="button"
              className={cropPrimary}
              disabled={!seasons.some((s) => s.id === selected)}
              onClick={() => {
                const season = seasons.find((s) => s.id === selected);
                if (season) onConfirm(season);
              }}
            >
              {t("confirmSeason")}
            </button>
          </footer>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
