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
import { CloseIcon } from "@/icons";
import { saveAdminUser } from "@/actions/admin/adminUsers";

const fieldClasses =
  "mt-2 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 aria-invalid:border-red-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:aria-invalid:border-red-500";
const labelClasses =
  "block text-sm font-medium text-gray-700 dark:text-gray-300";
const errorClasses = "mt-1 text-sm text-red-600 dark:text-red-400";

export default function AdminUserForm({ user, onClose }) {
  const tUi = useTranslations("adminUsers.form");

  const t = useTranslations("serverActions.adminUsers");
  const [submitError, setSubmitError] = useState("");
  const isEditing = user?.id ? true : false;
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
      mobile: user?.mobile ?? "",
      email: user?.email ?? "",
      password: "",
      password_confirmation: "",
      status:
        user?.status === false || user?.status === 0 || user?.status === "0"
          ? "0"
          : "1",
    },
    mode: "onTouched",
  });

  function handleClose() {
    if (!isSubmitting) onClose();
  }

  async function onSubmit(values) {
    setSubmitError("");

    const payload = { ...values };
    if (isEditing) {
      delete payload.password;
      delete payload.password_confirmation;
    }

    try {
      const result = await saveAdminUser(isEditing ? user.id : null, payload);
      if (!result.success) {
        for (const [field, messages] of Object.entries(result.errors ?? {})) {
          if (messages?.length) {
            setError(field, { type: "server", message: messages[0] });
          }
        }
        setSubmitError(result.message || t("saveFailed"));
        return;
      }
      toast.success(result.message || t("saved"));
      onClose();
    } catch {
      setSubmitError(t("saveFailed"));
    }
  }

  return (
    <Dialog
      open
      onClose={handleClose}
      className="relative z-99999"
      aria-busy={isSubmitting}
    >
      <DialogBackdrop className="fixed inset-0 bg-gray-950/40 backdrop-blur-sm" />
      <DialogPanel className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
        <div className="relative my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl sm:p-8 dark:bg-gray-900">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label={tUi("closeAdminForm")}
            className="absolute end-5 top-5 flex size-9 items-center justify-center rounded-full bg-gray-100 p-0 leading-none text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            <CloseIcon aria-hidden="true" className="block size-6 shrink-0" />
          </button>
          <DialogTitle className="pe-10 text-2xl font-semibold text-[#0b164d] dark:text-white">
            {isEditing ? tUi("editAdmin") : tUi("addAdmin")}
          </DialogTitle>
          <Description className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {tUi("manageAccountDetailsAndAdministratorAccess")}
          </Description>
          {submitError && (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
            >
              {submitError}
            </p>
          )}
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="mt-6 space-y-4"
          >
            <fieldset
              disabled={isSubmitting}
              className="grid gap-4 disabled:opacity-70 sm:grid-cols-2"
            >
              <legend className="sr-only">{tUi("administratorDetails")}</legend>

              <div>
                <label htmlFor="admin-first_name" className={labelClasses}>
                  {tUi("firstName")}
                </label>
                <input
                  {...register("first_name", {
                    required: tUi("firstNameIsRequired"),
                    maxLength: {
                      value: 255,
                      message: tUi("firstNameCannotExceed255Characters"),
                    },
                  })}
                  id="admin-first_name"
                  type="text"
                  autoComplete="given-name"
                  autoFocus
                  aria-required="true"
                  aria-invalid={Boolean(errors.first_name)}
                  aria-describedby={
                    errors.first_name ? "admin-first_name-error" : undefined
                  }
                  className={fieldClasses}
                />
                {errors.first_name && (
                  <p
                    id="admin-first_name-error"
                    role="alert"
                    className={errorClasses}
                  >
                    {errors.first_name.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="admin-last_name" className={labelClasses}>
                  {tUi("lastName")}
                </label>
                <input
                  {...register("last_name", {
                    required: tUi("lastNameIsRequired"),
                    maxLength: {
                      value: 255,
                      message: tUi("lastNameCannotExceed255Characters"),
                    },
                  })}
                  id="admin-last_name"
                  type="text"
                  autoComplete="family-name"
                  aria-required="true"
                  aria-invalid={Boolean(errors.last_name)}
                  aria-describedby={
                    errors.last_name ? "admin-last_name-error" : undefined
                  }
                  className={fieldClasses}
                />
                {errors.last_name && (
                  <p
                    id="admin-last_name-error"
                    role="alert"
                    className={errorClasses}
                  >
                    {errors.last_name.message}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="admin-mobile" className={labelClasses}>
                  {tUi("mobile")}{" "}
                  <span className="font-normal text-gray-400">
                    {tUi("optional")}
                  </span>
                </label>
                <input
                  {...register("mobile", {
                    maxLength: {
                      value: 30,
                      message: tUi("mobileNumberCannotExceed30Characters"),
                    },
                    pattern: {
                      value: /^[+()\d\s.-]+$/,
                      message: tUi("enterAValidMobileNumber"),
                    },
                  })}
                  id="admin-mobile"
                  type="tel"
                  autoComplete="tel"
                  maxLength={30}
                  aria-invalid={Boolean(errors.mobile)}
                  aria-describedby={
                    errors.mobile ? "admin-mobile-error" : undefined
                  }
                  className={fieldClasses}
                />
                {errors.mobile && (
                  <p
                    id="admin-mobile-error"
                    role="alert"
                    className={errorClasses}
                  >
                    {errors.mobile.message}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="admin-email" className={labelClasses}>
                  {tUi("email")}
                </label>
                <input
                  {...register("email", {
                    required: tUi("emailIsRequired"),
                    maxLength: {
                      value: 255,
                      message: tUi("emailCannotExceed255Characters"),
                    },
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: tUi("enterAValidEmailAddress"),
                    },
                  })}
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  maxLength={255}
                  aria-required="true"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={
                    errors.email ? "admin-email-error" : undefined
                  }
                  className={fieldClasses}
                />
                {errors.email && (
                  <p
                    id="admin-email-error"
                    role="alert"
                    className={errorClasses}
                  >
                    {errors.email.message}
                  </p>
                )}
              </div>

              {!isEditing && (
                <>
                  <div className="sm:col-span-2">
                    <label htmlFor="admin-password" className={labelClasses}>
                      {tUi("password")}
                    </label>
                    <input
                      {...register("password", {
                        required: tUi("passwordIsRequired"),
                        minLength: {
                          value: 8,
                          message: tUi("passwordMustBeAtLeast8Characters"),
                        },
                        maxLength: {
                          value: 255,
                          message: tUi("passwordCannotExceed255Characters"),
                        },
                      })}
                      id="admin-password"
                      type="password"
                      autoComplete="new-password"
                      maxLength={255}
                      aria-required="true"
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={
                        errors.password ? "admin-password-error" : undefined
                      }
                      className={fieldClasses}
                    />
                    {errors.password && (
                      <p
                        id="admin-password-error"
                        role="alert"
                        className={errorClasses}
                      >
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="admin-password_confirmation"
                      className={labelClasses}
                    >
                      {tUi("confirmPassword")}
                    </label>
                    <input
                      {...register("password_confirmation", {
                        required: tUi("pleaseConfirmThePassword"),
                        validate: (value) =>
                          value === getValues("password") ||
                          tUi("passwordsDoNotMatch"),
                      })}
                      id="admin-password_confirmation"
                      type="password"
                      autoComplete="new-password"
                      aria-required="true"
                      aria-invalid={Boolean(errors.password_confirmation)}
                      aria-describedby={
                        errors.password_confirmation
                          ? "admin-password_confirmation-error"
                          : undefined
                      }
                      className={fieldClasses}
                    />
                    {errors.password_confirmation && (
                      <p
                        id="admin-password_confirmation-error"
                        role="alert"
                        className={errorClasses}
                      >
                        {errors.password_confirmation.message}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="sm:col-span-2">
                <label htmlFor="admin-status" className={labelClasses}>
                  {tUi("status")}
                </label>
                <select
                  {...register("status", {
                    validate: (value) =>
                      ["0", "1"].includes(String(value)) ||
                      tUi("pleaseSelectAStatus"),
                  })}
                  id="admin-status"
                  aria-required="true"
                  aria-invalid={errors.status}
                  aria-describedby={
                    errors.status ? "admin-status-error" : undefined
                  }
                  className={fieldClasses}
                >
                  <option value="1">{tUi("active")}</option>
                  <option value="0">{tUi("inactive")}</option>
                </select>
                {errors.status && (
                  <p
                    id="admin-status-error"
                    role="alert"
                    className={errorClasses}
                  >
                    {errors.status.message}
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
                {tUi("cancel")}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-[#004bff] px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting
                  ? tUi("saving")
                  : isEditing
                    ? tUi("saveChanges")
                    : tUi("addAdmin")}
              </button>
            </div>
          </form>
        </div>
      </DialogPanel>
    </Dialog>
  );
}
