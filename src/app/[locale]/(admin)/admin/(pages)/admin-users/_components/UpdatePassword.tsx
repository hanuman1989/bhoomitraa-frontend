"use client";

import { useId } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Description,
} from "@headlessui/react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { changeAdminUserPassword } from "@/actions/admin/adminUsers";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import { CloseIcon } from "@/icons";
import type {
  AdminUser,
  ChangeAdminPasswordValues,
} from "@/types/admin/adminUser";

interface UpdatePasswordProps {
  user: AdminUser;
  onClose: () => void;
}

export default function UpdatePassword({ user, onClose }: UpdatePasswordProps) {
  const t = useTranslations("adminUsers.passwordDialog");
  const common = useTranslations("common");
  const formId = useId();
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangeAdminPasswordValues>({
    defaultValues: { password: "", password_confirmation: "" },
    mode: "onTouched",
  });

  function handleClose() {
    if (!isSubmitting) onClose();
  }

  async function onSubmit(values: ChangeAdminPasswordValues) {
    clearErrors("root.server");

    try {
      const result = await changeAdminUserPassword(user.id, values);
      if (!result.success) {
        for (const field of ["password", "password_confirmation"] as const) {
          const message = result.errors?.[field]?.[0];
          if (message) setError(field, { type: "server", message });
        }
        setError("root.server", {
          type: "server",
          message: result.message || t("failed"),
        });
        return;
      }

      reset();
      toast.success(result.message || t("saved"));
      onClose();
    } catch {
      setError("root.server", { type: "server", message: t("failed") });
    }
  }

  return (
    <Dialog
      open
      onClose={handleClose}
      className="relative z-99999"
      aria-busy={isSubmitting}
    >
      <DialogBackdrop className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm dark:bg-gray-950/60" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel className="shadow-theme-xl relative w-full max-w-lg rounded-2xl bg-white p-6 sm:p-8 dark:bg-gray-900">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              aria-label={common("close")}
              className="focus-visible:outline-brand-500 dark:focus-visible:outline-brand-400 absolute end-5 top-5 flex size-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <CloseIcon aria-hidden="true" className="size-6" />
            </button>
            <DialogTitle className="pe-10 text-2xl font-semibold text-gray-900 dark:text-white">
              {t("title")}
            </DialogTitle>
            <Description className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t("description", { name: user.full_name })}
            </Description>

            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="mt-6 space-y-5"
            >
              {errors.root?.server && (
                <p
                  role="alert"
                  className="bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-300 rounded-lg p-3 text-sm"
                >
                  {errors.root.server.message}
                </p>
              )}
              <fieldset
                disabled={isSubmitting}
                className="space-y-4 disabled:opacity-60"
              >
                <legend className="sr-only">{t("title")}</legend>
                <div>
                  <Label htmlFor={`${formId}-password`}>{t("password")}</Label>
                  <Input
                    {...register("password", {
                      required: t("validation.passwordRequired"),
                      minLength: {
                        value: 8,
                        message: t("validation.passwordMin"),
                      },
                      maxLength: {
                        value: 255,
                        message: t("validation.passwordMax"),
                      },
                      deps: "password_confirmation",
                    })}
                    id={`${formId}-password`}
                    type="password"
                    autoComplete="new-password"
                    data-autofocus
                    aria-required="true"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={
                      errors.password ? `${formId}-password-error` : undefined
                    }
                    error={Boolean(errors.password)}
                  />
                  {errors.password && (
                    <p
                      id={`${formId}-password-error`}
                      role="alert"
                      className="text-error-600 dark:text-error-400 mt-1 text-sm"
                    >
                      {errors.password.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor={`${formId}-confirmation`}>
                    {t("confirmation")}
                  </Label>
                  <Input
                    {...register("password_confirmation", {
                      required: t("validation.confirmationRequired"),
                      validate: (value) =>
                        value === getValues("password") ||
                        t("validation.mismatch"),
                    })}
                    id={`${formId}-confirmation`}
                    type="password"
                    autoComplete="new-password"
                    aria-required="true"
                    aria-invalid={Boolean(errors.password_confirmation)}
                    aria-describedby={
                      errors.password_confirmation
                        ? `${formId}-confirmation-error`
                        : undefined
                    }
                    error={Boolean(errors.password_confirmation)}
                  />
                  {errors.password_confirmation && (
                    <p
                      id={`${formId}-confirmation-error`}
                      role="alert"
                      className="text-error-600 dark:text-error-400 mt-1 text-sm"
                    >
                      {errors.password_confirmation.message}
                    </p>
                  )}
                </div>
              </fieldset>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {common("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-brand-500 hover:bg-brand-600 dark:bg-brand-500 dark:hover:bg-brand-400 rounded-lg px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:text-white"
                >
                  {isSubmitting ? t("saving") : t("submit")}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
