"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Description,
} from "@headlessui/react";
import { CloseIcon } from "@/icons";
import { deleteAdminUser } from "@/actions/admin/adminUsers";
import type { AdminUser } from "@/types/admin/adminUser";
import { useTranslations } from "next-intl";

export default function AdminUserDeleteConfirm({
  user,
  onClose,
}: {
  user: AdminUser;
  onClose: () => void;
}) {
  const tUi = useTranslations("adminUsers.deleteDialog");
  const tActions = useTranslations("serverActions.adminUsers");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  async function confirm() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    try {
      const result = await deleteAdminUser(user.id);
      if (!result.success) {
        setError(result.message);
        return;
      }
      toast.success(result.message || tActions("deleted"));
      onClose();
    } catch {
      setError(tUi("failed"));
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <Dialog
      open
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      className="relative z-99999"
      aria-busy={isSubmitting}
    >
      <DialogBackdrop className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm" />
      <DialogPanel className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
        <div className="relative my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl sm:p-8 dark:bg-gray-900">
          <button
            type="button"
            onClick={onClose}
            aria-label={tUi("closeAdminForm")}
            className="absolute end-5 top-5 flex size-9 items-center justify-center rounded-full bg-gray-100 p-0 leading-none text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            <CloseIcon aria-hidden="true" className="block size-6 shrink-0" />
          </button>
          <DialogTitle className="pe-10 text-2xl font-semibold text-[#0b164d] dark:text-white">
            {tUi("deleteAdminUser")}
          </DialogTitle>
          <Description className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {tUi.rich("confirmation", {
              name: user.full_name,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
            <br />
            {tUi("thisActionCannotBeUndoneAndTheUserWill")}
          </Description>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="rounded-lg border px-4 py-2"
            >
              {tUi("cancel")}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={confirm}
              className="rounded-lg bg-red-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {isSubmitting ? tUi("deleting") : tUi("delete")}
            </button>
          </div>
        </div>
      </DialogPanel>
    </Dialog>
  );
}
