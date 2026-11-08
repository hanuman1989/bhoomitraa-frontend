"use client";

import { useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useModal } from "@/hooks/useModal";
import { MoreDotIcon, PencilIcon, TrashBinIcon } from "@/icons";
import type { ActivityCategoryListItem } from "@/types/admin/activityCategory";
import ActivityCategoryConfirmDialog from "./ActivityCategoryConfirmDialog";

export default function ActivityCategoryRowActions({
  category,
  canManageSystem,
}: {
  category: ActivityCategoryListItem;
  canManageSystem: boolean;
}) {
  const t = useTranslations("activityCategories");
  const { isOpen, openModal, closeModal } = useModal();
  const [operation, setOperation] = useState<
    "delete" | "activate" | "deactivate"
  >("delete");
  const item =
    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-gray-700 data-focus:bg-brand-50 dark:text-gray-200 dark:data-focus:bg-gray-800";
  const name = category.name ?? category.slug;
  if (category.is_system && !canManageSystem)
    return (
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {t("protected")}
      </span>
    );
  function confirm(action: typeof operation) {
    setOperation(action);
    openModal();
  }
  return (
    <>
      <Menu>
        <MenuButton
          aria-label={t("actionsFor", { name })}
          className="focus-visible:outline-brand-500 flex size-9 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 focus-visible:outline-2 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <MoreDotIcon aria-hidden="true" className="size-5" />
        </MenuButton>
        <MenuItems
          anchor="bottom end"
          portal
          className="shadow-theme-lg z-99999 w-52 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900"
        >
          <MenuItem>
            <Link
              href={`/admin/activity-categories/${category.id}/edit`}
              className={item}
            >
              <PencilIcon aria-hidden="true" className="size-4" />
              {t("actions.edit")}
            </Link>
          </MenuItem>
          <MenuItem>
            <button
              type="button"
              className={item}
              onClick={() =>
                confirm(category.is_active ? "deactivate" : "activate")
              }
            >
              {t(
                category.is_active ? "actions.deactivate" : "actions.activate",
              )}
            </button>
          </MenuItem>
          {!category.is_system && !category.is_active && (
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
          )}
        </MenuItems>
      </Menu>
      {isOpen && (
        <ActivityCategoryConfirmDialog
          category={category}
          name={name}
          operation={operation}
          onClose={closeModal}
        />
      )}
    </>
  );
}
