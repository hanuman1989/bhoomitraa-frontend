"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { deleteCropFieldLayout } from "@/actions/admin/cropFieldLayouts";
import { useModal } from "@/hooks/useModal";
import { Link, useRouter } from "@/i18n/navigation";
import Tooltip from "@/components/common/Tooltip";
import { EyeIcon, PencilIcon, TrashBinIcon } from "@/icons";
import SeedConfirmDialog from "../../seeds/_components/SeedConfirmDialog";

const iconButton =
  "inline-flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700";

export default function CropFieldLayoutRowActions({
  id,
  name,
  isDraft,
}: {
  id: number;
  name: string;
  isDraft: boolean;
}) {
  const t = useTranslations("cropFieldLayouts");
  const router = useRouter();
  const { isOpen, openModal, closeModal } = useModal();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const deleting = useRef(false);
  const href = `/admin/crop-field-layouts/${id}`;
  const editLabel = t(isDraft ? "actions.resume" : "actions.edit");

  async function remove() {
    if (deleting.current) return;
    deleting.current = true;
    setBusy(true);
    setFailure("");
    try {
      const result = await deleteCropFieldLayout(id);
      if (result.success) {
        toast.success(result.message || t("deleted"));
        closeModal();
        router.refresh();
      } else {
        const message = result.message || t("deleteFailed");
        setFailure(message);
        toast.error(message);
      }
    } catch {
      setFailure(t("deleteFailed"));
      toast.error(t("deleteFailed"));
    } finally {
      deleting.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Tooltip content={t("actions.view")}>
          <Link
            href={href}
            aria-label={t("actions.view")}
            className={iconButton}
          >
            <EyeIcon aria-hidden="true" className="size-4" />
          </Link>
        </Tooltip>
        <Tooltip content={editLabel}>
          <Link
            href={`${href}/edit`}
            aria-label={editLabel}
            className={iconButton}
          >
            <PencilIcon aria-hidden="true" className="size-4" />
          </Link>
        </Tooltip>
        <Tooltip content={t("actions.delete")}>
          <button
            type="button"
            aria-label={t("actions.delete")}
            onClick={() => {
              setFailure("");
              openModal();
            }}
            className="bg-error-50 text-error-600 hover:bg-error-100 dark:bg-error-500/10 dark:text-error-300 dark:hover:bg-error-500/20 inline-flex size-8 items-center justify-center rounded-lg"
          >
            <TrashBinIcon aria-hidden="true" className="size-4" />
          </button>
        </Tooltip>
      </div>
      {isOpen && (
        <SeedConfirmDialog
          title={t("actions.delete")}
          description={[t("confirmDelete", { name }), failure]
            .filter(Boolean)
            .join(" ")}
          confirmLabel={t("actions.delete")}
          onClose={closeModal}
          onConfirm={() => void remove()}
          destructive
          busy={busy}
        />
      )}
    </>
  );
}
