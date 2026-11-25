"use client";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { deleteFarmerCrop } from "@/actions/account/farm-crops";
import type { CropStatus } from "@/types/account/farmCrop";
import CropConfirmDialog from "./CropConfirmDialog";

/**
 * Drafts are deleted, active crops are cancelled (history is kept) and
 * cancelled crops are deleted permanently together with their timeline.
 */
const copy = {
  draft: {
    action: "deleteDraft",
    description: "deleteDraftDescription",
    success: null,
  },
  cancelled: {
    action: "deleteCrop",
    description: "deleteCropDescription",
    success: "cropDeleted",
  },
  active: {
    action: "cancelCrop",
    description: "cancelCropDescription",
    success: null,
  },
} as const;

export default function CropDeleteConfirm({
  crop,
  onClose,
  onRemoved,
}: {
  crop: { id: number; name: string; status: CropStatus };
  onClose: () => void;
  onRemoved: () => void;
}) {
  const t = useTranslations("farmerCrops");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const text =
    crop.status === "draft" || crop.status === "cancelled"
      ? copy[crop.status]
      : copy.active;
  return (
    <CropConfirmDialog
      title={t(text.action)}
      description={t(text.description, { name: crop.name })}
      busy={busy}
      onClose={onClose}
      confirmLabel={t(text.action)}
      danger={crop.status === "draft" || crop.status === "cancelled"}
      onConfirm={async () => {
        if (pending.current) return;
        pending.current = true;
        setBusy(true);
        try {
          const result = await deleteFarmerCrop(crop.id);
          if (result.success) {
            toast.success(text.success ? t(text.success) : result.message);
            onRemoved();
          } else toast.error(result.message);
        } catch {
          toast.error(t("saveFailed"));
        } finally {
          pending.current = false;
          setBusy(false);
        }
      }}
    />
  );
}
