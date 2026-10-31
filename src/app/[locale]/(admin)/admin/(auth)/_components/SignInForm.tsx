"use client";

import { useState } from "react";
import Checkbox from "@/components/admin/form/input/Checkbox";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import Button from "@/components/admin/ui/button/Button";
import { useRouter } from "@/i18n/navigation";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import { loginAdmin } from "@/actions/admin/auth";
import { Controller, useForm } from "react-hook-form";
import type { AdminLoginPayload } from "@/types/auth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useTranslations } from "next-intl";

export default function SignInForm() {
  const tUi = useTranslations("auth.signIn");

  const router = useRouter();
  const { setAuth } = useAdminAuth();

  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginPayload>({
    defaultValues: { email: "", password: "", isChecked: false },
    mode: "onTouched",
    reValidateMode: "onChange",
  });
  async function signIn(values: AdminLoginPayload): Promise<void> {
    clearErrors("root.server");

    try {
      const result = await loginAdmin(values);

      if (!result.success) {
        if (result.errors?.email?.length) {
          setError("email", {
            type: "server",
            message: result.errors.email[0],
          });
        }
        if (result.errors?.password?.length) {
          setError("password", {
            type: "server",
            message: result.errors.password[0],
          });
        }
        setError("root.server", {
          type: "server",
          message: result.message || tUi("unableToSignIn"),
        });
        return;
      }

      router.replace("/admin/dashboard");
      router.refresh();
    } catch {
      setError("root.server", {
        type: "server",
        message: tUi("unableToSignInPleaseTryAgain"),
      });
    }
  }

  return (
    <div className="flex w-full flex-1 flex-col lg:w-1/2">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="text-title-sm sm:text-title-md mb-2 font-semibold text-gray-800 dark:text-white/90">
              {tUi("signIn")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {tUi("enterYourEmailAndPasswordToSignIn")}
            </p>
          </div>
          <div>
            <form onSubmit={handleSubmit(signIn)} noValidate>
              {errors.root?.server && (
                <p
                  role="alert"
                  className="border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400 mb-4 rounded-lg border p-3 text-sm"
                >
                  {errors.root.server.message}
                </p>
              )}
              <div className="space-y-6">
                <div>
                  <Label>
                    {tUi("email")}{" "}
                    <span className="text-error-500">*</span>{" "}
                  </Label>
                  <Input
                    {...register("email", {
                      required: tUi("emailIsRequired"),
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: tUi("pleaseEnterAValidEmailAddress"),
                      },
                      maxLength: {
                        value: 255,
                        message: tUi("emailMustBeAtMost255Characters"),
                      },
                      setValueAs: (value) => value.trim(),
                    })}
                    id="admin-login-email"
                    type="email"
                    autoComplete="email"
                    placeholder={tUi("enterYourEmail")}
                    aria-required="true"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={
                      errors.email ? "admin-login-email-error" : undefined
                    }
                  />
                  {errors.email && (
                    <p
                      id="admin-login-email-error"
                      role="alert"
                      className="text-error-500 mt-1.5 text-xs"
                    >
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label>
                    {tUi("password")}{" "}
                    <span className="text-error-500">*</span>{" "}
                  </Label>
                  <div className="relative">
                    <Input
                      {...register("password", {
                        required: tUi("passwordIsRequired"),
                        maxLength: {
                          value: 255,
                          message: tUi("passwordMustBeAtMost255Characters"),
                        },
                      })}
                      id="admin-login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder={tUi("enterYourPassword")}
                      aria-required="true"
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={
                        errors.password
                          ? "admin-login-password-error"
                          : undefined
                      }
                    />
                    <button
                      type="button"
                      aria-label={
                        showPassword ? tUi("hidePassword") : tUi("showPassword")
                      }
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((previous) => !previous)}
                      className="absolute inset-e-4 top-1/2 z-30 -translate-y-1/2 cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p
                      id="admin-login-password-error"
                      role="alert"
                      className="text-error-500 mt-1.5 text-xs"
                    >
                      {errors.password.message}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Controller
                      name="isChecked"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          id="admin-login-remember"
                          checked={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                    <span className="text-theme-sm block font-normal text-gray-700 dark:text-gray-400">
                      {tUi("keepMeLoggedIn")}
                    </span>
                  </div>
                </div>

                <div>
                  <Button disabled={isSubmitting} className="w-full" size="sm">
                    {isSubmitting ? tUi("signingIn") : tUi("signIn2")}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
