"use client";

import { useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { HorizontaLDots, PencilIcon, TrashBinIcon } from "@/icons";
import type { Crop } from "@/types/admin/crop";
import CropConfirmDialog from "./CropConfirmDialog";

export default function CropRowActions({
  crop,
  canActivate,
}: {
  crop: Crop;
  canActivate: boolean;
}) {
  const t = useTranslations("crops");
  const [operation, setOperation] = useState<
    "delete" | "activate" | "deactivate" | null
  >(null);
  const item =
    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-gray-700 data-focus:bg-brand-50 dark:text-gray-300 dark:data-focus:bg-gray-800";
  return (
    <>
      <Menu>
        <MenuButton
          aria-label={t("actionsFor", { name: crop.name ?? crop.slug })}
          className="shadow-theme-xs focus-visible:outline-brand-500 flex size-9 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 focus-visible:outline-2 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <HorizontaLDots aria-hidden="true" className="size-5" />
        </MenuButton>
        <MenuItems
          anchor="bottom end"
          portal
          className="shadow-theme-lg z-99999 w-52 rounded-xl border border-gray-200 bg-white p-1 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
        >
          <MenuItem>
            <Link href={`/admin/crops/${crop.id}/edit`} className={item}>
              <PencilIcon aria-hidden="true" className="size-4" />
              {t("actions.edit")}
            </Link>
          </MenuItem>
          <MenuItem disabled={!crop.is_active && !canActivate}>
            <button
              type="button"
              disabled={!crop.is_active && !canActivate}
              title={
                !crop.is_active && !canActivate
                  ? t("inactiveCategoryActivation")
                  : undefined
              }
              onClick={() =>
                setOperation(crop.is_active ? "deactivate" : "activate")
              }
              className={item}
            >
              {crop.is_active ? t("actions.deactivate") : t("actions.activate")}
            </button>
          </MenuItem>
          {!crop.is_active && (
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
        <CropConfirmDialog
          crop={crop}
          operation={operation}
          onClose={() => setOperation(null)}
        />
      )}
    </>
  );
}
