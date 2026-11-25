"use client";
import { useTranslations } from "next-intl";
import Tooltip from "@/components/common/Tooltip";
import { CheckLineIcon, ReopenIcon, TrashBinIcon } from "@/icons";
import type { BoundaryDrawMode } from "./boundaryDrawState";

const button =
  "shadow-theme-md focus-visible:outline-success-700 flex size-11 shrink-0 items-center justify-center rounded-full text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 sm:size-7";

export default function BoundaryDrawToolbar({
  mode,
  count,
  onUndo,
  onClear,
  onComplete,
}: {
  mode: BoundaryDrawMode;
  count: number;
  onUndo: () => void;
  onClear: () => void;
  onComplete: () => void;
}) {
  const t = useTranslations("farmerDashboard.boundaryDraw");
  const drawn = mode === "drawn";
  const blocked = !drawn && count < 3;
  const undo = t(drawn ? "reopen" : "undo");
  const complete = blocked ? t("minPoints") : t(drawn ? "addFarm" : "complete");
  return (
    <div
      role="toolbar"
      aria-label={t("toolbar")}
      className="flex items-center gap-1.5"
    >
      <Tooltip content={undo} className="shrink-0">
        <button
          type="button"
          disabled={!drawn && count === 0}
          onClick={onUndo}
          aria-label={undo}
          className={`${button} bg-gray-600`}
        >
          <ReopenIcon aria-hidden="true" className="block size-4 shrink-0" />
        </button>
      </Tooltip>
      <Tooltip content={t("clear")} className="shrink-0">
        <button
          type="button"
          onClick={onClear}
          aria-label={t("clear")}
          className={`${button} bg-error-600`}
        >
          <TrashBinIcon aria-hidden="true" className="block size-4 shrink-0" />
        </button>
      </Tooltip>
      <Tooltip content={complete} className="shrink-0">
        <button
          type="button"
          aria-disabled={blocked}
          onClick={() => {
            if (!blocked) onComplete();
          }}
          aria-label={complete}
          className={`${button} bg-success-700`}
        >
          <CheckLineIcon aria-hidden="true" className="block size-4 shrink-0" />
        </button>
      </Tooltip>
    </div>
  );
}
