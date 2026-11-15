"use client";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { resetUserPassword } from "@/actions/account/users";
import AccountInput from "@/components/common/AccountInput";
import { Link, useRouter } from "@/i18n/navigation";
import { MailIcon, LockIcon } from "@/icons";
import type { ResetPasswordPayload } from "@/lib/userAuth/types";

type ResetValues = Pick<
  ResetPasswordPayload,
  "email" | "password" | "password_confirmation"
>;
export default function ResetPasswordForm({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const t = useTranslations("account");
  const router = useRouter();
  const validLink = Boolean(
    token &&
    token.length <= 255 &&
    email &&
    email.length <= 255 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  );
  const {
    register,
    handleSubmit,
    getValues,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    defaultValues: { email, password: "", password_confirmation: "" },
    mode: "onTouched",
  });
  async function submit(values: ResetValues) {
    if (!validLink) return;
    clearErrors("root");
    try {
      const result = await resetUserPassword({ ...values, token });
      if (!result.success) {
        for (const field of [
          "email",
          "password",
          "password_confirmation",
        ] as const) {
          if (result.errors?.[field]?.[0])
            setError(field, {
              type: "server",
              message: result.errors[field][0],
            });
        }
        const message = result.errors?.token?.length
          ? t("reset.invalidLink")
          : result.message || t("feedback.resetFailed");
        setError("root.server", { message });
        toast.error(message);
        return;
      }
      toast.success(result.message || t("feedback.passwordReset"));
      router.replace("/account/login");
      router.refresh();
    } catch {
      setError("root.server", { message: t("feedback.resetFailed") });
      toast.error(t("feedback.resetFailed"));
    }
  }
  return (
    <>
      {!validLink ? (
        <p
          role="alert"
          className="bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400 rounded-lg p-4 text-sm"
        >
          {t("reset.invalidLink")}
        </p>
      ) : (
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
            {...register("email", {
              required: t("validation.emailRequired"),
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: t("validation.email"),
              },
              maxLength: { value: 255, message: t("validation.emailMax") },
            })}
            id="farmer-reset-email"
            type="email"
            autoComplete="email"
            label={t("fields.email")}
            icon={MailIcon}
            readOnly
            required
            disabled={isSubmitting}
            error={errors.email?.message}
          />
          <AccountInput
            {...register("password", {
              required: t("validation.passwordRequired"),
              maxLength: { value: 255, message: t("validation.passwordMax") },
              validate: (value) =>
                ([...value].length >= 12 &&
                  /\p{Ll}/u.test(value) &&
                  /\p{Lu}/u.test(value) &&
                  /\p{N}/u.test(value) &&
                  /[\p{Z}\p{S}\p{P}]/u.test(value)) ||
                t("validation.passwordPolicy"),
              deps: ["password_confirmation"],
            })}
            id="farmer-reset-password"
            type="password"
            autoComplete="new-password"
            label={t("reset.newPassword")}
            placeholder={t("register.passwordPlaceholder")}
            help={t("validation.passwordPolicy")}
            icon={LockIcon}
            required
            disabled={isSubmitting}
            error={errors.password?.message}
          />
          <AccountInput
            {...register("password_confirmation", {
              required: t("validation.confirmRequired"),
              maxLength: { value: 255, message: t("validation.passwordMax") },
              validate: (value) =>
                value === getValues("password") ||
                t("validation.passwordMatch"),
            })}
            id="farmer-reset-confirmation"
            type="password"
            autoComplete="new-password"
            label={t("fields.confirmPassword")}
            placeholder={t("fields.confirmPlaceholder")}
            icon={LockIcon}
            required
            disabled={isSubmitting}
            error={errors.password_confirmation?.message}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-success-700 hover:bg-success-800 focus-visible:outline-success-700 w-full rounded-xl px-5 py-3.5 text-lg font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
          >
            {isSubmitting ? t("reset.submitting") : t("reset.submit")}
          </button>
        </form>
      )}
      <p className="mt-6 text-center">
        <Link
          href="/account/login"
          className="text-success-800 dark:text-success-400 font-semibold underline underline-offset-4"
        >
          {t("reset.backToLogin")}
        </Link>
      </p>
    </>
  );
}
