"use client";

import { useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MoreDotIcon } from "@/icons";
import type { KnowledgeSource } from "@/types/admin/knowledgeSource";
import KnowledgeSourceConfirmDialog, {
  type SourceOperation,
} from "./KnowledgeSourceConfirmDialog";

export default function KnowledgeSourceRowActions({
  source,
  canReview,
  onChanged,
}: {
  source: KnowledgeSource;
  canReview: boolean;
  onChanged?: (source: KnowledgeSource) => void;
}) {
  const t = useTranslations("knowledgeSources");
  const [operation, setOperation] = useState<SourceOperation | null>(null);
  const item =
    "block w-full rounded-md px-3 py-2 text-start text-sm text-gray-700 data-focus:bg-brand-50 dark:text-gray-300 dark:data-focus:bg-gray-800";
  const operations: SourceOperation[] = [];
  if (canReview) {
    if (source.verification_status !== "verified") operations.push("verify");
    if (source.verification_status !== "rejected") operations.push("reject");
    if (source.verification_status === "verified") operations.push("outdate");
    if (source.verification_status !== "pending") operations.push("reopen");
  }
  if (source.is_active) operations.push("deactivate");
  else if (source.verification_status === "verified")
    operations.push("activate");
  if (!source.is_active) operations.push("delete");
  return (
    <>
      <Menu>
        <MenuButton
          aria-label={t("actionsFor", { title: source.title })}
          className="focus-visible:outline-brand-500 flex size-9 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 focus-visible:outline-2 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <MoreDotIcon aria-hidden="true" className="size-5" />
        </MenuButton>
        <MenuItems
          anchor="bottom end"
          portal
          className="shadow-theme-lg z-99999 w-56 rounded-xl border border-gray-200 bg-white p-1 focus:outline-none dark:border-gray-700 dark:bg-gray-900"
        >
          <MenuItem>
            <Link
              href={`/admin/knowledge-sources/${source.id}`}
              className={item}
            >
              {t("actions.view")}
            </Link>
          </MenuItem>
          <MenuItem>
            <Link
              href={`/admin/knowledge-sources/${source.id}/edit`}
              className={item}
            >
              {t("actions.edit")}
            </Link>
          </MenuItem>
          <MenuItem>
            <Link
              href={`/admin/knowledge-sources/${source.id}/edit#attachments`}
              className={item}
            >
              {t("actions.attachments")}
            </Link>
          </MenuItem>
          {operations.map((action) => (
            <MenuItem key={action}>
              <button
                type="button"
                onClick={() => setOperation(action)}
                className={`${item} ${action === "delete" ? "text-error-600 dark:text-error-400" : ""}`}
              >
                {t(`actions.${action}`)}
              </button>
            </MenuItem>
          ))}
        </MenuItems>
      </Menu>
      {operation && (
        <KnowledgeSourceConfirmDialog
          id={source.id}
          title={source.title}
          operation={operation}
          onSuccess={(updated) => {
            if (updated) onChanged?.(updated);
          }}
          onClose={() => setOperation(null)}
        />
      )}
    </>
  );
}
