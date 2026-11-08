"use client";

import { useRef, useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { Link, useRouter } from "@/i18n/navigation";
import { MoreDotIcon } from "@/icons";
import { useModal } from "@/hooks/useModal";
import {
  deleteCropSeedRate,
  updateCropSeedRateStatus,
} from "@/actions/admin/cropSeedRates";
import type { CropSeedRateListItem } from "@/types/admin/cropSeedRate";
import SeedConfirmDialog from "@/app/[locale]/(admin)/admin/(pages)/seeds/_components/SeedConfirmDialog";

export default function CropSeedRateRowActions({
  rate,
  canReview,
  detail = false,
}: {
  rate: CropSeedRateListItem;
  canReview: boolean;
  detail?: boolean;
}) {
  const t = useTranslations("cropSeedRates"),
    router = useRouter(),
    { isOpen, openModal, closeModal } = useModal();
  const [operation, setOperation] = useState<
      "delete" | "activate" | "deactivate"
    >("delete"),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState("");
  const saving = useRef(false),
    item =
      "block w-full rounded-lg px-3 py-2 text-start text-sm text-gray-700 data-focus:bg-brand-50 dark:text-gray-200 dark:data-focus:bg-gray-800";
  const name = t("rateName", {
    id: rate.id,
    name: rate.crop_name ?? t("cropId", { id: rate.crop_id }),
  });
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
          ? await deleteCropSeedRate(rate.id)
          : await updateCropSeedRateStatus(rate.id, operation === "activate");
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
      if (detail && operation === "delete")
        router.push("/admin/crop-seed-rates");
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
          disabled={busy}
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
          {!detail && (
            <MenuItem>
              <Link href={`/admin/crop-seed-rates/${rate.id}`} className={item}>
                {t("actions.view")}
              </Link>
            </MenuItem>
          )}
          {(!rate.is_active || canReview) && (
            <MenuItem>
              <Link
                href={`/admin/crop-seed-rates/${rate.id}/edit`}
                className={item}
              >
                {t("actions.edit")}
              </Link>
            </MenuItem>
          )}
          {(rate.is_active || canReview) && (
            <MenuItem>
              <button
                type="button"
                className={item}
                onClick={() =>
                  confirm(rate.is_active ? "deactivate" : "activate")
                }
              >
                {t(rate.is_active ? "actions.deactivate" : "actions.activate")}
              </button>
            </MenuItem>
          )}
          {!rate.is_active && (
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
