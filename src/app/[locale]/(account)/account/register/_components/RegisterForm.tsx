"use client";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { registerUser } from "@/actions/account/users";
import AccountInput from "@/components/common/AccountInput";
import { Link, useRouter } from "@/i18n/navigation";
import { PhoneIcon, UserIcon, MailIcon, LockIcon, GroupIcon } from "@/icons";
import type { UserRegisterValues } from "@/lib/userAuth/types";

export default function RegisterForm() {
  const t = useTranslations("account");
  const router = useRouter();
  const {
    register,
    handleSubmit,
    getValues,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UserRegisterValues>({
    defaultValues: {
      first_name: "",
      last_name: "",
      mobile: "",
      email: "",
      password: "",
      password_confirmation: "",
      terms_accepted: false,
    },
    mode: "onTouched",
  });
  async function submit(values: UserRegisterValues) {
    console.log("Submitting form with values:", values);
    clearErrors("root");
    try {
      const result = await registerUser({
        ...values,
        email: values.email || null,
      });
      if (!result.success) {
        for (const field of [
          "first_name",
          "last_name",
          "mobile",
          "email",
          "password",
          "password_confirmation",
          "terms_accepted",
        ] as const) {
          if (result.errors?.[field]?.[0])
            setError(field, {
              type: "server",
              message: result.errors[field][0],
            });
        }
        setError("root.server", {
          message: result.message || t("feedback.registerFailed"),
        });
        toast.error(result.message || t("feedback.registerFailed"));
        return;
      }
      toast.success(result.message || t("feedback.registered"));
      router.replace("/account/login");
      router.refresh();
    } catch {
      setError("root.server", { message: t("feedback.registerFailed") });
      toast.error(t("feedback.registerFailed"));
    }
  }
  return (
    <>
      <form
        onSubmit={handleSubmit(submit)}
        noValidate
        className="space-y-4"
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
        <div className="grid gap-4 sm:grid-cols-2">
          <AccountInput
            {...register("first_name", {
              required: t("validation.firstName"),
              validate: (value) =>
                Boolean(value.trim()) || t("validation.firstName"),
              maxLength: { value: 100, message: t("validation.nameMax") },
            })}
            id="farmer-register-first-name"
            autoComplete="given-name"
            label={t("fields.firstName")}
            placeholder={t("fields.firstNamePlaceholder")}
            icon={UserIcon}
            required
            disabled={isSubmitting}
            error={errors.first_name?.message}
          />
          <AccountInput
            {...register("last_name", {
              required: t("validation.lastName"),
              validate: (value) =>
                Boolean(value.trim()) || t("validation.lastName"),
              maxLength: { value: 100, message: t("validation.nameMax") },
            })}
            id="farmer-register-last-name"
            autoComplete="family-name"
            label={t("fields.lastName")}
            placeholder={t("fields.lastNamePlaceholder")}
            icon={UserIcon}
            required
            disabled={isSubmitting}
            error={errors.last_name?.message}
          />
        </div>
        <AccountInput
          {...register("mobile", {
            required: t("validation.mobileRequired"),
            pattern: { value: /^[6-9]\d{9}$/, message: t("validation.mobile") },
          })}
          id="farmer-register-mobile"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          label={t("fields.mobile")}
          placeholder={t("fields.mobilePlaceholder")}
          icon={PhoneIcon}
          required
          disabled={isSubmitting}
          error={errors.mobile?.message}
        />
        <AccountInput
          {...register("email", {
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: t("validation.email"),
            },
            maxLength: { value: 255, message: t("validation.emailMax") },
          })}
          id="farmer-register-email"
          type="email"
          autoComplete="email"
          label={t("fields.emailOptional")}
          placeholder={t("fields.emailOptionalPlaceholder")}
          icon={MailIcon}
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
          id="farmer-register-password"
          type="password"
          autoComplete="new-password"
          label={t("fields.password")}
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
              value === getValues("password") || t("validation.passwordMatch"),
          })}
          id="farmer-register-password-confirmation"
          type="password"
          autoComplete="new-password"
          label={t("fields.confirmPassword")}
          placeholder={t("fields.confirmPlaceholder")}
          icon={LockIcon}
          required
          disabled={isSubmitting}
          error={errors.password_confirmation?.message}
        />
        <div>
          <label
            htmlFor="farmer-register-terms"
            className="flex cursor-pointer items-start gap-3 text-sm sm:text-base"
          >
            <input
              {...register("terms_accepted", {
                validate: (value) => value === true || t("validation.terms"),
              })}
              id="farmer-register-terms"
              type="checkbox"
              required
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.terms_accepted)}
              aria-describedby={
                errors.terms_accepted
                  ? "farmer-register-terms-error"
                  : undefined
              }
              className="text-success-700 focus:ring-success-600 mt-0.5 size-5 shrink-0 rounded border-gray-400"
            />
            <span>
              {t.rich("register.terms", {
                terms: (chunks) => (
                  <span className="text-success-800 dark:text-success-400 font-semibold">
                    {chunks}
                  </span>
                ),
              })}
            </span>
          </label>
          {errors.terms_accepted && (
            <p
              id="farmer-register-terms-error"
              role="alert"
              className="text-error-600 dark:text-error-400 mt-1.5 text-xs"
            >
              {errors.terms_accepted.message}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="from-success-600 to-success-800 shadow-theme-sm hover:from-success-700 hover:to-success-900 focus-visible:outline-success-700 flex w-full items-center justify-center gap-3 rounded-xl bg-linear-to-r px-5 py-3.5 text-xl font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
        >
          <GroupIcon aria-hidden="true" className="size-6" />
          {isSubmitting ? t("register.submitting") : t("register.submit")}
        </button>
      </form>
      <div className="mt-6 flex items-center justify-center gap-3 text-center text-sm">
        <span
          aria-hidden="true"
          className="h-px flex-1 bg-gray-300 dark:bg-gray-700"
        />
        <p>
          {t("register.hasAccount")}{" "}
          <Link
            href="/account/login"
            className="text-success-800 dark:text-success-400 font-semibold underline underline-offset-4"
          >
            {t("register.loginLink")}
          </Link>
        </p>
        <span
          aria-hidden="true"
          className="h-px flex-1 bg-gray-300 dark:bg-gray-700"
        />
      </div>
    </>
  );
}
