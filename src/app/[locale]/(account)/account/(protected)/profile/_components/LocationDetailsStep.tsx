import { useEffect, useState } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { getProfileRegions } from "@/actions/account/users";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import { LocationPinIcon } from "@/icons";
import type { Region } from "@/types/admin/region";
import type { FarmerProfile } from "@/lib/userAuth/types";
import type { LocationDetailsValues } from "./UpdateProfileDialog";

export default function LocationDetailsStep({
  form,
  profile,
  disabled,
}: {
  form: UseFormReturn<LocationDetailsValues>;
  profile: FarmerProfile | null | undefined;
  disabled: boolean;
}) {
  const t = useTranslations("farmerProfile");
  const {
    register,
    control,
    setValue,
    clearErrors,
    formState: { errors },
  } = form;
  const stateId = useWatch({ control, name: "state_id" });
  const districtId = useWatch({ control, name: "district_id" });
  const [states, setStates] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<Region[]>([]);
  const [statesLoading, setStatesLoading] = useState(true);
  const [districtsLoading, setDistrictsLoading] = useState(Boolean(stateId));
  const [statesError, setStatesError] = useState("");
  const [districtsError, setDistrictsError] = useState("");
  const [statesAttempt, setStatesAttempt] = useState(0);
  const [districtsAttempt, setDistrictsAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await getProfileRegions();
        if (!active) return;
        if (result.success && result.data) setStates(result.data);
        else setStatesError(result.message || t("feedback.regionsFailed"));
      } catch {
        if (active) setStatesError(t("feedback.regionsFailed"));
      } finally {
        if (active) setStatesLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [statesAttempt, t]);
  useEffect(() => {
    if (!stateId) return;
    let active = true;
    async function load() {
      try {
        const result = await getProfileRegions(Number(stateId));
        if (!active) return;
        if (result.success && result.data) setDistricts(result.data);
        else setDistrictsError(result.message || t("feedback.regionsFailed"));
      } catch {
        if (active) setDistrictsError(t("feedback.regionsFailed"));
      } finally {
        if (active) setDistrictsLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [stateId, districtsAttempt, t]);
  return (
    <div className="space-y-4">
      <div className="mb-5 flex items-start gap-3">
        <span className="bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300 flex size-10 shrink-0 items-center justify-center rounded-lg">
          <LocationPinIcon
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-6 [&_path]:stroke-current"
          />
        </span>
        <div>
          <h3 className="text-xl font-bold text-gray-950 dark:text-white">
            {t("locationTitle")}
          </h3>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {t("locationDescription")}
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="profile-state">
            {t("fields.state")} <span className="text-error-500">*</span>
          </Label>
          <select
            {...register("state_id", {
              required: t("validation.state"),
              validate: (value) =>
                states.some((state) => state.id === Number(value)) ||
                value === String(profile?.state_id) ||
                t("validation.state"),
              onChange: (event) => {
                setValue("district_id", "", { shouldDirty: true });
                clearErrors("district_id");
                setDistricts([]);
                setDistrictsError("");
                setDistrictsLoading(Boolean(event.target.value));
              },
            })}
            id="profile-state"
            value={stateId}
            autoComplete="address-level1"
            autoFocus
            disabled={disabled || statesLoading}
            required
            aria-busy={statesLoading}
            aria-invalid={Boolean(errors.state_id)}
            aria-describedby={
              errors.state_id || statesError ? "profile-state-error" : undefined
            }
            className="focus:border-success-500 focus:ring-success-500/20 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-2 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          >
            <option value="">
              {statesLoading ? t("loadingStates") : t("placeholders.state")}
            </option>
            {profile?.state &&
              stateId === String(profile.state_id) &&
              !states.some((state) => state.id === profile.state_id) && (
                <option value={String(profile.state_id)}>
                  {profile.state.name || t("empty")}
                </option>
              )}
            {states.map((state) => (
              <option key={state.id} value={state.id}>
                {state.name || t("unnamedRegion")}
              </option>
            ))}
          </select>
          {(errors.state_id || statesError) && (
            <p
              id="profile-state-error"
              role="alert"
              className="text-error-600 dark:text-error-400 mt-1 text-xs"
            >
              {errors.state_id?.message || statesError}
            </p>
          )}
          {statesError && (
            <button
              type="button"
              disabled={disabled || statesLoading}
              onClick={() => {
                setStatesLoading(true);
                setStatesError("");
                setStatesAttempt((attempt) => attempt + 1);
              }}
              className="text-success-700 focus-visible:outline-success-600 dark:text-success-300 mt-1 text-sm font-medium underline focus-visible:outline-2 disabled:opacity-50"
            >
              {t("retry")}
            </button>
          )}
        </div>
        <div>
          <Label htmlFor="profile-district">
            {t("fields.district")} <span className="text-error-500">*</span>
          </Label>
          <select
            {...register("district_id", {
              required: t("validation.district"),
              validate: (value) =>
                districts.some(
                  (district) =>
                    district.id === Number(value) &&
                    district.parent_id === Number(stateId),
                ) ||
                (stateId === String(profile?.state_id) &&
                  value === String(profile?.district_id)) ||
                t("validation.district"),
            })}
            id="profile-district"
            value={districtId}
            autoComplete="address-level2"
            disabled={disabled || !stateId || districtsLoading}
            required
            aria-busy={Boolean(stateId) && districtsLoading}
            aria-invalid={Boolean(errors.district_id)}
            aria-describedby={
              errors.district_id || districtsError
                ? "profile-district-error"
                : undefined
            }
            className="focus:border-success-500 focus:ring-success-500/20 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:ring-2 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          >
            <option value="">
              {!stateId
                ? t("selectStateFirst")
                : districtsLoading
                  ? t("loadingDistricts")
                  : t("placeholders.district")}
            </option>
            {profile?.district &&
              stateId === String(profile.state_id) &&
              districtId === String(profile.district_id) &&
              !districts.some(
                (district) => district.id === profile.district_id,
              ) && (
                <option value={String(profile.district_id)}>
                  {profile.district.name || t("empty")}
                </option>
              )}
            {districts.map((district) => (
              <option key={district.id} value={district.id}>
                {district.name || t("unnamedRegion")}
              </option>
            ))}
          </select>
          {(errors.district_id || districtsError) && (
            <p
              id="profile-district-error"
              role="alert"
              className="text-error-600 dark:text-error-400 mt-1 text-xs"
            >
              {errors.district_id?.message || districtsError}
            </p>
          )}
          {districtsError && (
            <button
              type="button"
              disabled={disabled || districtsLoading}
              onClick={() => {
                setDistrictsLoading(true);
                setDistrictsError("");
                setDistrictsAttempt((attempt) => attempt + 1);
              }}
              className="text-success-700 focus-visible:outline-success-600 dark:text-success-300 mt-1 text-sm font-medium underline focus-visible:outline-2 disabled:opacity-50"
            >
              {t("retry")}
            </button>
          )}
        </div>
      </div>
      <div>
        <Label htmlFor="profile-village">
          {t("fields.village")} <span className="text-error-500">*</span>
        </Label>
        <Input
          {...register("village", {
            required: t("validation.village"),
            maxLength: { value: 150, message: t("validation.villageMax") },
            validate: (value) =>
              Boolean(value.trim()) || t("validation.village"),
          })}
          id="profile-village"
          autoComplete="address-level3"
          disabled={disabled}
          required
          error={Boolean(errors.village)}
          aria-invalid={Boolean(errors.village)}
          aria-describedby={
            errors.village ? "profile-village-error" : undefined
          }
        />
        {errors.village && (
          <p
            id="profile-village-error"
            role="alert"
            className="text-error-600 dark:text-error-400 mt-1 text-xs"
          >
            {errors.village.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="profile-address">{t("fields.address")}</Label>
        <textarea
          {...register("address", {
            maxLength: { value: 500, message: t("validation.addressMax") },
          })}
          id="profile-address"
          rows={3}
          autoComplete="street-address"
          placeholder={t("placeholders.address")}
          disabled={disabled}
          aria-invalid={Boolean(errors.address)}
          aria-describedby={
            errors.address ? "profile-address-error" : undefined
          }
          className="focus:border-success-500 focus:ring-success-500/20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />
        {errors.address && (
          <p
            id="profile-address-error"
            role="alert"
            className="text-error-600 dark:text-error-400 mt-1 text-xs"
          >
            {errors.address.message}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="profile-pincode">{t("fields.pincode")}</Label>
        <Input
          {...register("pincode", {
            validate: (value) =>
              !value.trim() ||
              /^[1-9][0-9]{5}$/.test(value.trim()) ||
              t("validation.pincode"),
          })}
          id="profile-pincode"
          type="text"
          inputMode="numeric"
          maxLength={6}
          autoComplete="postal-code"
          disabled={disabled}
          error={Boolean(errors.pincode)}
          aria-invalid={Boolean(errors.pincode)}
          aria-describedby={
            errors.pincode ? "profile-pincode-error" : undefined
          }
        />
        {errors.pincode && (
          <p
            id="profile-pincode-error"
            role="alert"
            className="text-error-600 dark:text-error-400 mt-1 text-xs"
          >
            {errors.pincode.message}
          </p>
        )}
      </div>
    </div>
  );
}
