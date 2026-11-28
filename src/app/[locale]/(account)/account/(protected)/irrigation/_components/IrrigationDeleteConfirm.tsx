"use client";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { deleteIrrigationAsset } from "@/actions/account/irrigation";
import type { IrrigationAsset } from "@/types/account/irrigation";
import CropConfirmDialog from "../../crops/_components/CropConfirmDialog";

/**
 * Confirms a soft delete. Only this asset leaves the list, summary and map;
 * farms, crops and other irrigation assets are not touched.
 */
export default function IrrigationDeleteConfirm({
  asset,
  onClose,
  onDeleted,
}: {
  asset: Pick<IrrigationAsset, "id" | "name" | "asset_type">;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const t = useTranslations("farmerIrrigation");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  return (
    <CropConfirmDialog
      title={t("delete.title", { name: asset.name })}
      description={t(
        asset.asset_type === "source"
          ? "delete.sourceDescription"
          : "delete.pipelineDescription",
      )}
      busy={busy}
      busyLabel={t("delete.deleting")}
      confirmLabel={t("actions.delete")}
      cancelLabel={t("actions.cancel")}
      danger
      onClose={onClose}
      onConfirm={async () => {
        if (pending.current) return;
        pending.current = true;
        setBusy(true);
        try {
          const result = await deleteIrrigationAsset(asset.id);
          if (result.success) {
            toast.success(result.message || t("toasts.deleted"));
            onDeleted(asset.id);
          } else toast.error(result.message || t("errors.deleteFailed"));
        } catch {
          toast.error(t("errors.deleteFailed"));
        } finally {
          pending.current = false;
          setBusy(false);
        }
      }}
    />
  );
}
