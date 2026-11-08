"use client";

import { useRef, useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MoreDotIcon } from "@/icons";
import { useModal } from "@/hooks/useModal";
import toast from "react-hot-toast";
import { deleteSeed, updateSeedStatus } from "@/actions/admin/seeds";
import type { SeedListItem } from "@/types/admin/seed";
import SeedConfirmDialog from "./SeedConfirmDialog";

export default function SeedRowActions({
  seed,
  canReview,
}: {
  seed: SeedListItem;
  canReview: boolean;
}) {
  const t = useTranslations("seeds");
  const { isOpen, openModal, closeModal } = useModal();
  const [operation, setOperation] = useState<
      "delete" | "activate" | "deactivate"
    >("delete"),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState("");
  const saving = useRef(false),
    name = seed.name ?? t("recordId", { id: seed.id });
  const item =
    "block w-full rounded-lg px-3 py-2 text-start text-sm text-gray-700 data-focus:bg-brand-50 dark:text-gray-200 dark:data-focus:bg-gray-800";
  function confirm(value: typeof operation) {
    if (saving.current) return;
    setFailure("");
    setOperation(value);
    openModal();
  }
  async function act() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setFailure("");
    try {
      const result =
        operation === "delete"
          ? await deleteSeed(seed.id)
          : await updateSeedStatus(seed.id, operation === "activate");
      if (!result.success) {
        const message =
          Object.values(result.errors ?? {})
            .flat()
            .join(" ") ||
          result.message ||
          t("feedback.failed");
        setFailure(message);
        toast.error(message);
        return;
      }
      toast.success(result.message || t("feedback.saved"));
      closeModal();
    } catch {
      setFailure(t("feedback.failed"));
      toast.error(t("feedback.failed"));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <Menu>
        <MenuButton
          aria-label={t("actionsFor", { name })}
          className="flex size-9 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <MoreDotIcon aria-hidden="true" className="size-5" />
        </MenuButton>
        <MenuItems
          anchor="bottom end"
          portal
          className="shadow-theme-lg z-99999 w-52 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900"
        >
          <MenuItem>
            <Link href={`/admin/seeds/${seed.id}`} className={item}>
              {t("actions.view")}
            </Link>
          </MenuItem>
          <MenuItem>
            <Link
              href={`/admin/seeds/${seed.id}/step/${seed.setup_status === "draft" ? Math.min(4, seed.next_step ?? 1) : 1}`}
              className={item}
            >
              {t(
                seed.setup_status === "draft"
                  ? "actions.resume"
                  : "actions.edit",
              )}
            </Link>
          </MenuItem>
          {(seed.is_active ||
            (canReview && seed.setup_status === "completed")) && (
            <MenuItem>
              <button
                type="button"
                className={item}
                onClick={() =>
                  confirm(seed.is_active ? "deactivate" : "activate")
                }
              >
                {t(seed.is_active ? "actions.deactivate" : "actions.activate")}
              </button>
            </MenuItem>
          )}
          {!seed.is_active && (
            <MenuItem>
              <button
                type="button"
                className={`${item} text-error-600 dark:text-error-400`}
                onClick={() => confirm("delete")}
              >
                {t("actions.delete")}
              </button>
            </MenuItem>
          )}
        </MenuItems>
      </Menu>
      {isOpen && (
        <SeedConfirmDialog
          title={t(`actions.${operation}`)}
          description={`${t(`confirm.${operation}`, { name })}${failure ? ` ${failure}` : ""}`}
          confirmLabel={t(`actions.${operation}`)}
          destructive={operation === "delete"}
          busy={busy}
          onClose={() => {
            if (!saving.current) closeModal();
          }}
          onConfirm={() => void act()}
        />
      )}
    </>
  );
}
