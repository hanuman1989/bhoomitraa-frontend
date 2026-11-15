"use client";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import Input from "@/components/admin/form/input/InputField";
import { HomeIcon, InfoIcon, LocationPinIcon } from "@/icons";
import type { FarmerProfile } from "@/lib/userAuth/types";
import type { Farm } from "@/types/account/farm";
import FarmField from "./FarmField";
import useFarmRegions from "./useFarmRegions";
import { farmControl, type FarmFormValues } from "./farmFormTypes";
export interface FarmLocationLabels {
  label: string;
  state: string;
  district: string;
  tehsil: string;
}
export default function FarmLocationStep({
  form,
  profile,
  farm,
  onLocation,
  hasBoundary,
}: {
  form: UseFormReturn<FarmFormValues>;
  profile: FarmerProfile | null;
  farm?: Farm;
  onLocation: (location: FarmLocationLabels) => void;
  hasBoundary: boolean;
}) {
  const t = useTranslations("farmerFarms");
  const {
    control,
    register,
    getValues,
    setValue,
    formState: { errors },
  } = form;
  const [stateId, districtId, tehsilId, village] = useWatch({
    control,
    name: ["state_id", "district_id", "tehsil_id", "village"],
  });
  const states = useFarmRegions("state"),
    districts = useFarmRegions("district", stateId),
    tehsils = useFarmRegions("subdistrict", districtId);
  const savedStateId = farm ? farm.state_id : profile?.state_id;
  const savedDistrictId = farm ? farm.district_id : profile?.district_id;
  const stateName =
    states.items.find((item) => String(item.id) === stateId)?.name ??
    (stateId === String(savedStateId)
      ? farm
        ? farm.state?.name
        : profile?.state?.name
      : "");
  const districtName =
    districts.items.find((item) => String(item.id) === districtId)?.name ??
    (stateId === String(savedStateId) && districtId === String(savedDistrictId)
      ? farm
        ? farm.district?.name
        : profile?.district?.name
      : "");
  const tehsilName =
    tehsils.items.find((item) => String(item.id) === tehsilId)?.name ??
    (farm &&
    districtId === String(farm.district_id) &&
    tehsilId === String(farm.tehsil_id)
      ? farm.tehsil?.name
      : "");
  const profileLocation = [
    profile?.village,
    profile?.district?.name,
    profile?.state?.name,
  ]
    .filter(Boolean)
    .join(", ");
  // Synchronize display metadata only; profile refreshes never overwrite form fields.
  const location = [village, tehsilName, districtName, stateName]
    .filter(Boolean)
    .join(", ");
  useEffect(() => {
    onLocation({
      label: location,
      state: stateName ?? "",
      district: districtName ?? "",
      tehsil: tehsilName ?? "",
    });
  }, [location, stateName, districtName, tehsilName, onLocation]);
  const stateField = register("state_id", {
    required: t("validation.stateRequired"),
    validate: (value) =>
      states.items.some((item) => String(item.id) === value) ||
      t("validation.selection"),
  });
  const districtField = register("district_id", {
    required: t("validation.districtRequired"),
    validate: (value) =>
      districts.items.some(
        (item) =>
          String(item.id) === value &&
          String(item.parent_id) === getValues("state_id"),
      ) || t("validation.selection"),
  });
  return (
    <div className="space-y-4 rounded-xl border border-gray-100 p-4 sm:p-5 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <span className="bg-success-50 text-success-700 dark:bg-success-950 rounded-full p-3">
          <LocationPinIcon className="size-7" />
        </span>
        <div>
          <h3 className="text-xl font-bold">{t("wizard.steps.location")}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t("locationIntro")}
          </p>
        </div>
      </div>
      <p className="bg-success-50 dark:bg-success-950 flex items-center gap-3 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-200">
        <InfoIcon className="text-success-700 size-5 shrink-0" />
        {t("wizard.locationHint")}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <FarmField
          id="farm-state"
          label={t("fields.state")}
          required
          error={errors.state_id?.message}
        >
          <select
            id="farm-state"
            {...stateField}
            value={stateId}
            disabled={states.loading || states.error}
            onChange={(event) => {
              void stateField.onChange(event);
              setValue("district_id", "", { shouldDirty: true });
              setValue("tehsil_id", "", { shouldDirty: true });
            }}
            aria-required="true"
            aria-invalid={!!errors.state_id}
            aria-describedby={errors.state_id ? "farm-state-error" : undefined}
            className={farmControl}
          >
            <option value="">
              {t(states.loading ? "wizard.loadingRegions" : "chooseState")}
            </option>
            {stateId &&
              stateId === String(savedStateId) &&
              !states.items.some((item) => String(item.id) === stateId) && (
                <option value={stateId}>
                  {stateName ||
                    t(states.loading ? "wizard.loadingRegions" : "notProvided")}
                </option>
              )}
            {states.items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name ?? item.code ?? String(item.id)}
              </option>
            ))}
          </select>
        </FarmField>
        <FarmField
          id="farm-district"
          label={t("fields.district")}
          required
          error={errors.district_id?.message}
        >
          <select
            id="farm-district"
            {...districtField}
            value={districtId}
            disabled={!stateId || districts.loading || districts.error}
            onChange={(event) => {
              void districtField.onChange(event);
              setValue("tehsil_id", "", { shouldDirty: true });
            }}
            aria-required="true"
            aria-invalid={!!errors.district_id}
            aria-describedby={
              errors.district_id ? "farm-district-error" : undefined
            }
            className={farmControl}
          >
            <option value="">
              {t(
                districts.loading ? "wizard.loadingRegions" : "chooseDistrict",
              )}
            </option>
            {districtId &&
              stateId === String(savedStateId) &&
              districtId === String(savedDistrictId) &&
              !districts.items.some(
                (item) => String(item.id) === districtId,
              ) && (
                <option value={districtId}>
                  {districtName ||
                    t(
                      districts.loading
                        ? "wizard.loadingRegions"
                        : "notProvided",
                    )}
                </option>
              )}
            {districts.items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name ?? item.code ?? String(item.id)}
              </option>
            ))}
          </select>
        </FarmField>
        <FarmField
          id="farm-tehsil"
          label={t("fields.tehsil")}
          error={errors.tehsil_id?.message}
        >
          <select
            id="farm-tehsil"
            value={tehsilId}
            {...register("tehsil_id", {
              validate: (value) =>
                !value ||
                tehsils.items.some(
                  (item) =>
                    String(item.id) === value &&
                    String(item.parent_id) === getValues("district_id"),
                ) ||
                t("validation.selection"),
            })}
            disabled={!districtId || tehsils.loading || tehsils.error}
            aria-invalid={!!errors.tehsil_id}
            aria-describedby={
              errors.tehsil_id ? "farm-tehsil-error" : undefined
            }
            className={farmControl}
          >
            <option value="">
              {t(tehsils.loading ? "wizard.loadingRegions" : "optionalTehsil")}
            </option>
            {tehsilId &&
              farm &&
              districtId === String(farm.district_id) &&
              tehsilId === String(farm.tehsil_id) &&
              !tehsils.items.some((item) => String(item.id) === tehsilId) && (
                <option value={tehsilId}>
                  {tehsilName ||
                    t(
                      tehsils.loading ? "wizard.loadingRegions" : "notProvided",
                    )}
                </option>
              )}
            {tehsils.items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name ?? item.code ?? String(item.id)}
              </option>
            ))}
          </select>
        </FarmField>
        <FarmField
          id="farm-village"
          label={t("fields.village")}
          required
          error={errors.village?.message}
        >
          <Input
            id="farm-village"
            {...register("village", {
              validate: (value) =>
                value.trim().length > 0 || t("validation.villageRequired"),
              maxLength: {
                value: 150,
                message: t("validation.villageTooLong"),
              },
            })}
            error={!!errors.village}
            aria-required="true"
            aria-invalid={!!errors.village}
            aria-describedby={errors.village ? "farm-village-error" : undefined}
            placeholder={t("fields.villagePlaceholder")}
          />
        </FarmField>
      </div>
      <FarmField
        id="farm-address"
        label={t("fields.address")}
        error={errors.address?.message}
      >
        <Input
          id="farm-address"
          {...register("address", {
            maxLength: {
              value: 500,
              message: t("validation.max", { count: 500 }),
            },
          })}
          error={!!errors.address}
          aria-invalid={!!errors.address}
          aria-describedby={errors.address ? "farm-address-error" : undefined}
          placeholder={t("fields.addressPlaceholder")}
        />
      </FarmField>
      {[states, districts, tehsils]
        .filter((result) => result.error)
        .map((result, index) => (
          <p key={index} role="alert" className="text-error-600 text-sm">
            {t("regionsFailed")}{" "}
            <button type="button" onClick={result.retry} className="underline">
              {t("retry")}
            </button>
          </p>
        ))}
      <div className="flex items-center gap-3 rounded-xl bg-gray-100 p-3 dark:bg-gray-800">
        <HomeIcon className="text-success-700 size-8" />
        <div className="flex-1">
          <h4 className="text-sm font-bold">{t("profileReference")}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {profileLocation || t("notProvided")}
          </p>
        </div>
        <span className="bg-success-100 text-success-700 rounded-full px-3 py-1 text-xs font-semibold">
          {t("fromProfile")}
        </span>
      </div>
      {(hasBoundary && form.formState.dirtyFields.state_id) ||
      (hasBoundary && form.formState.dirtyFields.district_id) ||
      (hasBoundary && form.formState.dirtyFields.village) ? (
        <p
          role="status"
          className="bg-warning-50 text-warning-800 dark:bg-warning-950 dark:text-warning-200 rounded-xl p-3 text-sm"
        >
          {t("locationBoundaryWarning")}
        </p>
      ) : null}
    </div>
  );
}
