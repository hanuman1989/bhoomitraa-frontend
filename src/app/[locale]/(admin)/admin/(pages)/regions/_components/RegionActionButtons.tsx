"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MoreDotIcon, PencilIcon, TrashBinIcon } from "@/icons";
import { useModal } from "@/hooks/useModal";
import type { Region } from "@/types/admin/region";
import RegionDeleteConfirm from "./RegionDeleteConfirm";

interface RegionActionButtonsProps {
  region: Region;
}

export default function RegionActionButtons({
  region,
}: RegionActionButtonsProps) {
  const t = useTranslations("regions");
  const { isOpen, openModal, closeModal } = useModal();
  return (
    <>
      <Menu>
        <MenuButton
          aria-label={t("actions.forRegion", {
            name: region.name ?? t("unnamed"),
          })}
          className="hover:bg-brand-50 focus-visible:outline-brand-500 flex size-9 items-center justify-center rounded-md text-gray-800 focus-visible:outline-2 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <MoreDotIcon aria-hidden="true" className="size-6" />
        </MenuButton>
        <MenuItems
          anchor="bottom end"
          portal
          className="shadow-theme-lg z-99999 w-50 rounded-lg border border-gray-200 bg-white p-1 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
        >
          <MenuItem>
            <Link
              href={`/admin/regions/${region.id}/edit`}
              className="data-focus:bg-brand-50 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-800 dark:text-gray-200 dark:data-focus:bg-gray-800"
            >
              <PencilIcon aria-hidden="true" className="size-5" />
              {t("actions.edit")}
            </Link>
          </MenuItem>
          <MenuItem>
            <button
              type="button"
              onClick={openModal}
              className="text-error-600 data-focus:bg-error-50 dark:text-error-400 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm dark:data-focus:bg-gray-800"
            >
              <TrashBinIcon aria-hidden="true" className="size-5" />
              {t("actions.delete")}
            </button>
          </MenuItem>
        </MenuItems>
      </Menu>
      {isOpen && <RegionDeleteConfirm region={region} onClose={closeModal} />}
    </>
  );
}
