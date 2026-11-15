"use client";
import { useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Description,
} from "@headlessui/react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { forgotUserPassword } from "@/actions/account/users";
import AccountInput from "@/components/common/AccountInput";
import { MailIcon, CloseLineIcon } from "@/icons";
import type { ForgotPasswordPayload } from "@/lib/userAuth/types";

export default function ForgotPasswordDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("account");
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    clearErrors,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordPayload>({
    defaultValues: { email: "" },
    mode: "onTouched",
  });
  function close() {
    if (isSubmitting) return;
    reset();
    setSent(false);
    onClose();
  }
  async function submit(values: ForgotPasswordPayload) {
    clearErrors("root");
    try {
      const result = await forgotUserPassword(values);
      if (!result.success) {
        if (result.errors?.email?.[0])
          setError("email", {
            type: "server",
            message: result.errors.email[0],
          });
        setError("root.server", {
          message: result.message || t("feedback.recoveryFailed"),
        });
        toast.error(result.message || t("feedback.recoveryFailed"));
        return;
      }
      setSent(true);
    } catch {
      setError("root.server", { message: t("feedback.recoveryFailed") });
      toast.error(t("feedback.recoveryFailed"));
    }
  }
  return (
    <Dialog open={isOpen} onClose={close} className="relative z-99999">
      <DialogBackdrop className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />
      <div className="fixed inset-0 overflow-y-auto p-4">
        <div className="flex min-h-full items-center justify-center">
          <DialogPanel className="shadow-theme-lg relative w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900">
            <button
              type="button"
              onClick={close}
              disabled={isSubmitting}
              aria-label={t("recovery.close")}
              className="focus-visible:outline-success-600 absolute end-3 top-3 rounded-lg p-2 text-gray-500 focus-visible:outline-2 disabled:opacity-50"
            >
              <CloseLineIcon aria-hidden="true" className="size-5" />
            </button>
            <DialogTitle className="pe-8 text-xl font-semibold text-gray-900 dark:text-white">
              {t("recovery.title")}
            </DialogTitle>
            <Description className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {t("recovery.description")}
            </Description>
            {sent ? (
              <>
                <p
                  role="status"
                  className="bg-success-50 text-success-800 dark:bg-success-900/30 dark:text-success-300 mt-5 rounded-lg p-4 text-sm"
                >
                  {t("feedback.resetLinkSent")}
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="bg-success-700 focus-visible:outline-success-700 mt-5 w-full rounded-lg px-4 py-3 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {t("recovery.done")}
                </button>
              </>
            ) : (
              <form
                onSubmit={handleSubmit(submit)}
                noValidate
                className="mt-5 space-y-4"
                aria-busy={isSubmitting}
              >
                {errors.root?.server && (
                  <p
                    role="alert"
                    className="text-error-600 dark:text-error-400 text-sm"
                  >
                    {errors.root.server.message}
                  </p>
                )}
                <AccountInput
                  {...register("email", {
                    required: t("validation.emailRequired"),
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: t("validation.email"),
                    },
                    maxLength: {
                      value: 255,
                      message: t("validation.emailMax"),
                    },
                  })}
                  id="farmer-recovery-email"
                  type="email"
                  autoComplete="email"
                  label={t("fields.email")}
                  placeholder={t("fields.emailPlaceholder")}
                  icon={MailIcon}
                  required
                  disabled={isSubmitting}
                  error={errors.email?.message}
                  autoFocus
                />
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  {t("recovery.emailOnly")}
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={close}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-success-700 focus-visible:outline-success-700 rounded-lg px-4 py-2.5 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
                  >
                    {isSubmitting
                      ? t("recovery.submitting")
                      : t("recovery.submit")}
                  </button>
                </div>
              </form>
            )}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
