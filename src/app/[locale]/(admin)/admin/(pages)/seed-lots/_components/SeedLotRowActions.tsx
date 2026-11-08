"use client";

import { useRef, useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { Link, useRouter } from "@/i18n/navigation";
import { MoreDotIcon } from "@/icons";
import { useModal } from "@/hooks/useModal";
import {
  deleteSeedLot,
  updateSeedLotStatus,
  updateSeedLotVerification,
} from "@/actions/admin/seedLots";
import {
  verificationStatuses,
  type VerificationStatus,
} from "@/types/admin/knowledgeSource";
import type { SeedLot } from "@/types/admin/seedLot";
import SeedConfirmDialog from "@/app/[locale]/(admin)/admin/(pages)/seeds/_components/SeedConfirmDialog";

type Operation = "delete" | "activate" | "deactivate" | VerificationStatus;
export default function SeedLotRowActions({
  lot,
  canReview,
  detail = false,
}: {
  lot: SeedLot;
  canReview: boolean;
  detail?: boolean;
}) {
  const t = useTranslations("seedLots"),
    router = useRouter(),
    { isOpen, openModal, closeModal } = useModal();
  const [operation, setOperation] = useState<Operation>("delete"),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState("");
  const saving = useRef(false),
    item =
      "block w-full rounded-lg px-3 py-2 text-start text-sm text-gray-700 data-focus:bg-brand-50 dark:text-gray-200 dark:data-focus:bg-gray-800";
  const review = verificationStatuses.some((value) => value === operation);
  const label = review
    ? t("actions.verifyAs", { status: t(`verification.${operation}`) })
    : t(`actions.${operation}`);
  function confirm(value: Operation) {
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
          ? await deleteSeedLot(lot.id)
          : operation === "activate" || operation === "deactivate"
            ? await updateSeedLotStatus(lot.id, operation === "activate")
            : await updateSeedLotVerification(lot.id, operation);
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
      if (detail && operation === "delete") router.push("/admin/seed-lots");
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
          aria-label={t("actionsFor", { name: lot.lot_number })}
          className="flex size-9 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <MoreDotIcon aria-hidden="true" className="size-5" />
        </MenuButton>
        <MenuItems
          anchor="bottom end"
          portal
          className="shadow-theme-lg z-99999 w-56 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900"
        >
          {!detail && (
            <MenuItem>
              <Link href={`/admin/seed-lots/${lot.id}`} className={item}>
                {t("actions.view")}
              </Link>
            </MenuItem>
          )}
          <MenuItem>
            <Link href={`/admin/seed-lots/${lot.id}/edit`} className={item}>
              {t("actions.edit")}
            </Link>
          </MenuItem>
          {lot.report_url && (
            <MenuItem>
              <Link
                href={`/admin/seed-lots/${lot.id}/report`}
                prefetch={false}
                download
                className={item}
              >
                {t("report.download")}
              </Link>
            </MenuItem>
          )}
          <MenuItem>
            <button
              type="button"
              className={item}
              onClick={() => confirm(lot.is_active ? "deactivate" : "activate")}
            >
              {t(lot.is_active ? "actions.deactivate" : "actions.activate")}
            </button>
          </MenuItem>
          {canReview &&
            verificationStatuses
              .filter((value) => value !== lot.verification_status)
              .map((value) => (
                <MenuItem key={value}>
                  <button
                    type="button"
                    className={item}
                    onClick={() => confirm(value)}
                  >
                    {t("actions.verifyAs", {
                      status: t(`verification.${value}`),
                    })}
                  </button>
                </MenuItem>
              ))}
          {!lot.is_active && (
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
          title={label}
          description={`${review ? t("confirm.verification", { name: lot.lot_number, status: t(`verification.${operation}`) }) : t(`confirm.${operation}`, { name: lot.lot_number })}${failure ? ` ${failure}` : ""}`}
          confirmLabel={label}
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
