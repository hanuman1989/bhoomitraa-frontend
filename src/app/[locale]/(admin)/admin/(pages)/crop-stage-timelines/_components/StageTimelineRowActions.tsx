"use client";

import { useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useModal } from "@/hooks/useModal";
import { DocsIcon, HorizontaLDots, PencilIcon, TrashBinIcon } from "@/icons";
import type { StageTimelineListItem } from "@/types/admin/cropStageTimeline";
import StageTimelineConfirmDialog from "./StageTimelineConfirmDialog";

export default function StageTimelineRowActions({
  timeline,
  name,
}: {
  timeline: StageTimelineListItem;
  name: string;
}) {
  const t = useTranslations("stageTimelines");
  const { isOpen, openModal, closeModal } = useModal();
  const [operation, setOperation] = useState<
    "delete" | "activate" | "deactivate"
  >("delete");
  const item =
    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-gray-700 data-focus:bg-brand-50 dark:text-gray-200 dark:data-focus:bg-gray-800";
  function confirm(action: typeof operation) {
    setOperation(action);
    openModal();
  }
  return (
    <>
      <Menu>
        <MenuButton
          aria-label={t("actionsFor", { name })}
          className="shadow-theme-xs focus-visible:outline-brand-500 flex size-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 focus-visible:outline-2 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <HorizontaLDots aria-hidden="true" className="size-5" />
        </MenuButton>
        <MenuItems
          anchor="bottom end"
          portal
          className="shadow-theme-lg z-99999 w-52 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900"
        >
          <MenuItem>
            <Link
              href={`/admin/crop-stage-timelines/${timeline.id}/edit`}
              className={item}
            >
              <PencilIcon aria-hidden="true" className="size-4" />
              {t("actions.edit")}
            </Link>
          </MenuItem>
          <MenuItem>
            <Link
              href={`/admin/knowledge-sources/${timeline.source_id}`}
              className={item}
            >
              <DocsIcon aria-hidden="true" className="size-4 shrink-0" />
              <span className="min-w-0">
                <span className="block">{t("fields.source")}</span>
                <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                  {timeline.source_title ?? t("notAvailable")}
                </span>
              </span>
            </Link>
          </MenuItem>
          <MenuItem>
            <button
              type="button"
              onClick={() =>
                confirm(timeline.is_active ? "deactivate" : "activate")
              }
              className={item}
            >
              {t(
                timeline.is_active ? "actions.deactivate" : "actions.activate",
              )}
            </button>
          </MenuItem>
          <MenuItem>
            <button
              type="button"
              onClick={() => confirm("delete")}
              className={`${item} text-error-600 dark:text-error-400`}
            >
              <TrashBinIcon aria-hidden="true" className="size-4" />
              {t("actions.delete")}
            </button>
          </MenuItem>
        </MenuItems>
      </Menu>
      {isOpen && (
        <StageTimelineConfirmDialog
          timeline={timeline}
          name={name}
          operation={operation}
          onClose={closeModal}
        />
      )}
    </>
  );
}
