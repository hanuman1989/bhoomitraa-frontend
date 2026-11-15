import type { UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";
import AreaUnitSelect from "@/components/common/AreaUnitSelect";
import useAreaUnits from "@/hooks/useAreaUnits";
import { isSupportedAreaUnit } from "@/lib/areaUnits";
import { useTranslations } from "next-intl";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import { LockIcon, UserIcon } from "@/icons";
import { routing } from "@/i18n/routing";
import type { FarmerUser } from "@/lib/userAuth/types";
import type { PersonalDetailsValues } from "./UpdateProfileDialog";

export default function PersonalDetailsStep({
  form,
  user,
  disabled,
}: {
  form: UseFormReturn<PersonalDetailsValues>;
  user: FarmerUser;
  disabled: boolean;
}) {
  const t = useTranslations("farmerProfile");
  const metadata = useAreaUnits();
  const unit = useWatch({ control: form.control, name: "preferred_units" });
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <div className="space-y-4">
      <div className="mb-5 flex items-start gap-3">
        <span className="bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300 flex size-10 shrink-0 items-center justify-center rounded-lg">
          <UserIcon aria-hidden="true" viewBox="0 0 20 20" className="size-6" />
        </span>
        <div>
          <h3 className="text-xl font-bold text-gray-950 dark:text-white">
            {t("personalStep")}
          </h3>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {t("personalDescription")}
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="profile-first-name">
            {t("fields.firstName")} <span className="text-error-500">*</span>
          </Label>
          <Input
            {...register("first_name", {
              required: t("validation.firstName"),
              maxLength: { value: 100, message: t("validation.nameMax") },
              validate: (value) =>
                Boolean(value.trim()) || t("validation.firstName"),
            })}
            id="profile-first-name"
            autoComplete="given-name"
            autoFocus
            disabled={disabled}
            required
            error={Boolean(errors.first_name)}
            aria-invalid={Boolean(errors.first_name)}
            aria-describedby={
              errors.first_name ? "profile-first-name-error" : undefined
            }
          />
          {errors.first_name && (
            <p
              id="profile-first-name-error"
              role="alert"
              className="text-error-600 dark:text-error-400 mt-1 text-xs"
            >
              {errors.first_name.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="profile-last-name">
            {t("fields.lastName")} <span className="text-error-500">*</span>
          </Label>
          <Input
            {...register("last_name", {
              required: t("validation.lastName"),
              maxLength: { value: 100, message: t("validation.nameMax") },
              validate: (value) =>
                Boolean(value.trim()) || t("validation.lastName"),
            })}
            id="profile-last-name"
            autoComplete="family-name"
            disabled={disabled}
            required
            error={Boolean(errors.last_name)}
            aria-invalid={Boolean(errors.last_name)}
            aria-describedby={
              errors.last_name ? "profile-last-name-error" : undefined
            }
          />
          {errors.last_name && (
            <p
              id="profile-last-name-error"
              role="alert"
              className="text-error-600 dark:text-error-400 mt-1 text-xs"
            >
              {errors.last_name.message}
            </p>
          )}
        </div>
      </div>
      <div>
        <Label htmlFor="profile-email">{t("fields.email")}</Label>
        <div className="relative">
          <Input
            id="profile-email"
            value={user.email ?? ""}
            placeholder={t("empty")}
            readOnly
            disabled={disabled}
            aria-describedby="profile-readonly"
            className="pe-10 read-only:bg-gray-100 read-only:text-gray-600 dark:read-only:bg-gray-800 dark:read-only:text-gray-300"
          />
          <LockIcon
            aria-hidden="true"
            className="pointer-events-none absolute end-3 top-3 size-5 text-gray-500"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="profile-mobile">{t("fields.mobile")}</Label>
        <div className="relative">
          <Input
            id="profile-mobile"
            value={user.mobile}
            readOnly
            disabled={disabled}
            aria-describedby="profile-readonly"
            className="pe-10 read-only:bg-gray-100 read-only:text-gray-600 dark:read-only:bg-gray-800 dark:read-only:text-gray-300"
          />
          <LockIcon
            aria-hidden="true"
            className="pointer-events-none absolute end-3 top-3 size-5 text-gray-500"
          />
        </div>
      </div>
      <p id="profile-readonly" className="sr-only">
        {t("readonlyContact")}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="profile-language">
            {t("fields.preferredLanguage")}{" "}
            <span className="text-error-500">*</span>
          </Label>
          <select
            {...register("preferred_language", {
              required: t("validation.language"),
              validate: (value) =>
                value === "en" || value === "hi" || t("validation.language"),
            })}
            id="profile-language"
            disabled={disabled}
            required
            aria-invalid={Boolean(errors.preferred_language)}
            aria-describedby={
              errors.preferred_language ? "profile-language-error" : undefined
            }
            className="focus:border-success-500 focus:ring-success-500/20 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-2 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          >
            <option value="">{t("placeholders.language")}</option>
            {routing.locales.map((locale) => (
              <option key={locale} value={locale}>
                {t(`languages.${locale}`)}
              </option>
            ))}
          </select>
          {errors.preferred_language && (
            <p
              id="profile-language-error"
              role="alert"
              className="text-error-600 dark:text-error-400 mt-1 text-xs"
            >
              {errors.preferred_language.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="profile-units">
            {t("fields.preferredUnits")}{" "}
            <span className="text-error-500">*</span>
          </Label>
          <AreaUnitSelect
            {...register("preferred_units", {
              required: t("validation.units"),
              validate: (value) =>
                isSupportedAreaUnit(value, metadata.config) ||
                t("validation.units"),
            })}
            id="profile-units"
            value={unit}
            onChange={(value) =>
              form.setValue("preferred_units", value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            error={errors.preferred_units?.message}
            disabled={disabled}
            required
            aria-invalid={Boolean(errors.preferred_units)}
            aria-describedby={
              errors.preferred_units ? "profile-units-error" : undefined
            }
            className="focus:border-success-500 focus:ring-success-500/20 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-2 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
        </div>
      </div>
    </div>
  );
}
