"use client";

import { useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useModal } from "@/hooks/useModal";
import {
  MoreDotIcon,
  PencilIcon,
  EyeIcon,
  DocsIcon,
  TrashBinIcon,
} from "@/icons";
import type { CropActivityTemplateListItem } from "@/types/admin/cropActivityTemplate";
import CropActivityTemplateConfirmDialog from "./CropActivityTemplateConfirmDialog";

export default function CropActivityTemplateRowActions({
  template,
  canReview,
}: {
  template: CropActivityTemplateListItem;
  canReview: boolean;
}) {
  const t = useTranslations("cropActivityTemplates");
  const { isOpen, openModal, closeModal } = useModal();
  const [operation, setOperation] = useState<
    "delete" | "activate" | "deactivate"
  >("delete");
  const name = template.title ?? t("recordId", { id: template.id });
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
          className="focus-visible:outline-brand-500 flex size-9 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 focus-visible:outline-2 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <MoreDotIcon aria-hidden="true" className="size-5" />
        </MenuButton>
        <MenuItems
          anchor="bottom end"
          portal
          className="shadow-theme-lg z-99999 w-56 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900"
        >
          {(!template.is_active || canReview) && (
            <MenuItem>
              <Link
                href={`/admin/crop-activity-templates/${template.id}/edit`}
                className={item}
              >
                <PencilIcon aria-hidden="true" className="size-4" />
                {t("actions.edit")}
              </Link>
            </MenuItem>
          )}
          <MenuItem>
            <Link
              href={`/admin/crop-activity-templates/${template.id}`}
              className={item}
            >
              <EyeIcon aria-hidden="true" className="size-4" />
              {t("actions.preview")}
            </Link>
          </MenuItem>
          <MenuItem>
            <Link
              href={`/admin/knowledge-sources/${template.source_id}`}
              className={item}
            >
              <DocsIcon aria-hidden="true" className="size-4 shrink-0" />
              <span className="min-w-0">
                <span className="block">{t("actions.source")}</span>
                <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                  {template.source_title ?? t("notAvailable")}
                </span>
              </span>
            </Link>
          </MenuItem>
          {(template.is_active || canReview) && (
            <MenuItem>
              <button
                type="button"
                className={item}
                onClick={() =>
                  confirm(template.is_active ? "deactivate" : "activate")
                }
              >
                {t(
                  template.is_active
                    ? "actions.deactivate"
                    : "actions.activate",
                )}
              </button>
            </MenuItem>
          )}
          {!template.is_active && (
            <MenuItem>
              <button
                type="button"
                className={`${item} text-error-600 dark:text-error-400`}
                onClick={() => confirm("delete")}
              >
                <TrashBinIcon aria-hidden="true" className="size-4" />
                {t("actions.delete")}
              </button>
            </MenuItem>
          )}
        </MenuItems>
      </Menu>
      {isOpen && (
        <CropActivityTemplateConfirmDialog
          template={template}
          name={name}
          operation={operation}
          onClose={closeModal}
        />
      )}
    </>
  );
}
