"use client";
import { useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { HorizontaLDots, PencilIcon, TrashBinIcon } from "@/icons";
import type { CropVariety } from "@/types/admin/cropVariety";
import CropVarietyConfirmDialog from "./CropVarietyConfirmDialog";

export default function CropVarietyRowActions({
  variety,
}: {
  variety: CropVariety;
}) {
  const t = useTranslations("cropVarieties");
  const [operation, setOperation] = useState<
    "delete" | "activate" | "deactivate" | null
  >(null);
  const item =
    "data-focus:bg-brand-50 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-gray-700 dark:text-gray-200 dark:data-focus:bg-gray-800";
  return (
    <>
      <Menu>
        <MenuButton
          aria-label={t("actionsFor", {
            name: variety.name ?? variety.slug,
          })}
          className="shadow-theme-xs flex size-9 items-center justify-center rounded-lg border border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300"
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
              href={`/admin/crop-varieties/${variety.id}/edit`}
              className={item}
            >
              <PencilIcon aria-hidden="true" className="size-4" />
              {t("actions.edit")}
            </Link>
          </MenuItem>
          <MenuItem>
            <button
              type="button"
              onClick={() =>
                setOperation(variety.is_active ? "deactivate" : "activate")
              }
              className={item}
            >
              {t(variety.is_active ? "actions.deactivate" : "actions.activate")}
            </button>
          </MenuItem>
          {!variety.is_active && (
            <MenuItem>
              <button
                type="button"
                onClick={() => setOperation("delete")}
                className={`${item} text-error-600 dark:text-error-400`}
              >
                <TrashBinIcon aria-hidden="true" className="size-4" />
                {t("actions.delete")}
              </button>
            </MenuItem>
          )}
        </MenuItems>
      </Menu>
      {operation && (
        <CropVarietyConfirmDialog
          variety={variety}
          operation={operation}
          onClose={() => setOperation(null)}
        />
      )}
    </>
  );
}
