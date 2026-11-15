"use client";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { loginUser } from "@/actions/account/auth";
import AccountInput from "@/components/common/AccountInput";
import { useUserAuth } from "@/hooks/useUserAuth";
import { useModal } from "@/hooks/useModal";
import { Link, useRouter } from "@/i18n/navigation";
import { PhoneIcon, LockIcon, ArrowRightIcon } from "@/icons";
import type { UserLoginPayload } from "@/lib/userAuth/types";
import ForgotPasswordDialog from "./ForgotPasswordDialog";

export default function LoginForm() {
  const t = useTranslations("account");
  const router = useRouter();
  const { setAuth } = useUserAuth();
  const { isOpen, openModal, closeModal } = useModal();
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<UserLoginPayload>({
    defaultValues: { login: "", password: "" },
    mode: "onTouched",
  });
  async function submit(values: UserLoginPayload) {
    if (isSubmitting) return;
    clearErrors("root");
    try {
      const result = await loginUser(values);
      if (!result.success || !result.data) {
        for (const field of ["login", "password"] as const) {
          if (result.errors?.[field]?.[0])
            setError(field, {
              type: "server",
              message: result.errors[field][0],
            });
        }
        setError("root.server", {
          message: result.message || t("feedback.loginFailed"),
        });
        toast.error(result.message || t("feedback.loginFailed"));
        return;
      }
      setAuth(result.data);
      toast.success(result.message || t("feedback.loggedIn"));
      router.replace("/account/dashboard");
      router.refresh();
    } catch {
      setError("root.server", { message: t("feedback.loginFailed") });
      toast.error(t("feedback.loginFailed"));
    }
  }
  return (
    <>
      <form
        onSubmit={handleSubmit(submit)}
        noValidate
        className="space-y-5"
        aria-busy={isSubmitting}
      >
        {errors.root?.server && (
          <p
            role="alert"
            className="bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400 rounded-lg p-3 text-sm"
          >
            {errors.root.server.message}
          </p>
        )}
        <AccountInput
          {...register("login", {
            setValueAs: (value: string) => value.trim(),
            required: t("login.identifierRequired"),
            maxLength: { value: 255, message: t("login.identifierInvalid") },
            validate: (value) =>
              /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ||
              /^[6-9][0-9]{9}$/.test(value) ||
              t("login.identifierInvalid"),
          })}
          id="farmer-login-identifier"
          type="text"
          autoComplete="username"
          label={t("login.identifier")}
          placeholder={t("login.identifierPlaceholder")}
          icon={PhoneIcon}
          required
          disabled={isSubmitting}
          error={errors.login?.message}
        />
        <AccountInput
          {...register("password", {
            required: t("login.passwordRequired"),
            maxLength: { value: 255, message: t("validation.passwordMax") },
          })}
          id="farmer-login-password"
          type="password"
          autoComplete="current-password"
          label={t("fields.password")}
          placeholder={t("login.passwordPlaceholder")}
          icon={LockIcon}
          required
          disabled={isSubmitting}
          error={errors.password?.message}
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={openModal}
            disabled={isSubmitting}
            className="text-success-800 focus-visible:outline-success-600 dark:text-success-400 font-medium underline underline-offset-4 focus-visible:outline-2 disabled:opacity-50"
          >
            {t("login.forgot")}
          </button>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="from-success-600 to-success-800 shadow-theme-sm hover:from-success-700 hover:to-success-900 focus-visible:outline-success-700 flex w-full items-center justify-center gap-3 rounded-xl bg-linear-to-r px-5 py-3.5 text-xl font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
        >
          <ArrowRightIcon
            aria-hidden="true"
            className="size-6 rtl:rotate-180"
          />
          {isSubmitting ? t("login.submitting") : t("login.submit")}
        </button>
      </form>
      <div className="mt-7 flex items-center justify-center gap-3 text-center text-sm sm:text-base">
        <span
          aria-hidden="true"
          className="h-px flex-1 bg-gray-300 dark:bg-gray-700"
        />
        <p>
          {t("login.newFarmer")}{" "}
          <Link
            href="/account/register"
            className="text-success-800 dark:text-success-400 font-semibold underline underline-offset-4"
          >
            {t("login.registerLink")}
          </Link>
        </p>
        <span
          aria-hidden="true"
          className="h-px flex-1 bg-gray-300 dark:bg-gray-700"
        />
      </div>
      <ForgotPasswordDialog isOpen={isOpen} onClose={closeModal} />
    </>
  );
}
