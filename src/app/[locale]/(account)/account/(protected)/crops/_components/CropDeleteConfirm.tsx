"use client";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { deleteFarmerCrop } from "@/actions/account/farm-crops";
import type { CropStatus } from "@/types/account/farmCrop";
import CropConfirmDialog from "./CropConfirmDialog";
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
  return (
    <CropConfirmDialog
      title={t(crop.status === "draft" ? "deleteDraft" : "cancelCrop")}
      description={t(
        crop.status === "draft"
          ? "deleteDraftDescription"
          : "cancelCropDescription",
        { name: crop.name },
      )}
      busy={busy}
      onClose={onClose}
      confirmLabel={t(crop.status === "draft" ? "deleteDraft" : "cancelCrop")}
      onConfirm={async () => {
        if (pending.current) return;
        pending.current = true;
        setBusy(true);
        try {
          const result = await deleteFarmerCrop(crop.id);
          if (result.success) {
            toast.success(result.message);
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
