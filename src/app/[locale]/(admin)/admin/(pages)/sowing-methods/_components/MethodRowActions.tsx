"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { Link, useRouter } from "@/i18n/navigation";
import {
  deleteSowingMethod,
  updateSowingMethodStatus,
} from "@/actions/admin/sowingMethods";
import Badge from "@/components/admin/ui/badge/Badge";
import Tooltip from "@/components/common/Tooltip";
import { EyeIcon, PencilIcon, TrashBinIcon } from "@/icons";
import type { SowingMethodListItem } from "@/types/admin/sowingMethod";
import SeedConfirmDialog from "../../seeds/_components/SeedConfirmDialog";

export default function MethodRowActions({
  method,
  part,
}: {
  method: SowingMethodListItem;
  part: "status" | "actions";
}) {
  const t = useTranslations("sowingMethods");
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const name = method.title || method.code;
  const base = `/admin/sowing-methods/${method.id}`;
  const deleting = part === "actions";
  const label = t(
    deleting ? "delete" : method.is_active ? "deactivate" : "activate",
  );
  const iconButton =
    "inline-flex size-8 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700";
  const description = t(
    deleting
      ? "confirmDelete"
      : method.is_active
        ? "confirmDeactivate"
        : "confirmActivate",
    { name },
  );

  async function submit() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = deleting
        ? await deleteSowingMethod(method.id)
        : await updateSowingMethodStatus(method.id, !method.is_active);
      if (result.success) {
        toast.success(result.message || t("saved"));
        setConfirm(false);
        router.refresh();
        return;
      }
      const message =
        [...new Set(Object.values(result.errors ?? {}).flat())].join(" ") ||
        result.message ||
        t("failed");
      setError(message);
      toast.error(message);
    } catch {
      setError(t("failed"));
      toast.error(t("failed"));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      {part === "status" ? (
        <Tooltip content={label}>
          <button
            type="button"
            onClick={() => setConfirm(true)}
            aria-label={label}
          >
            <Badge color={method.is_active ? "success" : "warning"}>
              <span
                className="size-1.5 rounded-full bg-current"
                aria-hidden="true"
              />
              {t(method.is_active ? "active" : "inactive")}
            </Badge>
          </button>
        </Tooltip>
      ) : (
        <div className="flex items-center gap-1.5">
          <Tooltip content={t("view")}>
            <Link href={base} aria-label={t("view")} className={iconButton}>
              <EyeIcon aria-hidden="true" className="size-4" />
            </Link>
          </Tooltip>
          <Tooltip content={t("edit")}>
            <Link
              href={`${base}/edit`}
              aria-label={t("edit")}
              className={iconButton}
            >
              <PencilIcon aria-hidden="true" className="size-4" />
            </Link>
          </Tooltip>
          <Tooltip content={label}>
            <button
              type="button"
              onClick={() => setConfirm(true)}
              aria-label={label}
              className="bg-error-50 text-error-600 hover:bg-error-100 dark:bg-error-500/10 dark:text-error-300 dark:hover:bg-error-500/20 inline-flex size-8 items-center justify-center rounded-lg"
            >
              <TrashBinIcon aria-hidden="true" className="size-4" />
            </button>
          </Tooltip>
        </div>
      )}
      {confirm && (
        <SeedConfirmDialog
          title={label}
          description={error ? `${description} ${error}` : description}
          confirmLabel={label}
          busy={busy}
          destructive={deleting}
          onClose={() => {
            setConfirm(false);
            setError("");
          }}
          onConfirm={() => void submit()}
        />
      )}
    </>
  );
}
