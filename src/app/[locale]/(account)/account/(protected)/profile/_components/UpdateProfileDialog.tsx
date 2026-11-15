"use client";
import { useRef, useState } from "react";
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
import {
  updatePersonalDetails,
  updateLocationDetails,
} from "@/actions/account/users";
import { useUserAuth } from "@/hooks/useUserAuth";
import { canonicalAreaUnit } from "@/lib/areaUnits";
import {
  ArrowRightIcon,
  CheckLineIcon,
  ChevronLeftIcon,
  CloseLineIcon,
  FarmLandscapeIcon,
  LocationPinIcon,
  ShieldCheckIcon,
  SproutIcon,
} from "@/icons";
import type { FarmerUser, PersonalDetailsPayload } from "@/lib/userAuth/types";
import PersonalDetailsStep from "./PersonalDetailsStep";
import LocationDetailsStep from "./LocationDetailsStep";
import ProfileStepIndicator from "./ProfileStepIndicator";

export interface PersonalDetailsValues extends Omit<
  PersonalDetailsPayload,
  "preferred_language" | "preferred_units"
> {
  preferred_language: PersonalDetailsPayload["preferred_language"] | "";
  preferred_units: PersonalDetailsPayload["preferred_units"] | "";
}
export interface LocationDetailsValues {
  state_id: string;
  district_id: string;
  village: string;
  address: string;
  pincode: string;
}

export default function UpdateProfileDialog({
  user,
  initials,
  onClose,
}: {
  user: FarmerUser;
  initials: string;
  onClose: () => void;
}) {
  const t = useTranslations("farmerProfile");
  const { setAuth } = useUserAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [personalSaved, setPersonalSaved] = useState(false);
  const pending = useRef(false);
  const personal = useForm<PersonalDetailsValues>({
    mode: "onTouched",
    defaultValues: {
      first_name: user.first_name,
      last_name: user.last_name,
      preferred_language: user.farmer_profile?.preferred_language ?? "",
      preferred_units: canonicalAreaUnit(user.farmer_profile?.preferred_units),
    },
  });
  const location = useForm<LocationDetailsValues>({
    mode: "onTouched",
    defaultValues: {
      state_id: String(user.farmer_profile?.state_id ?? ""),
      district_id: String(user.farmer_profile?.district_id ?? ""),
      village: user.farmer_profile?.village ?? "",
      address: user.farmer_profile?.address ?? "",
      pincode: user.farmer_profile?.pincode ?? "",
    },
  });
  const busy =
    personal.formState.isSubmitting || location.formState.isSubmitting;
  const error =
    step === 1
      ? personal.formState.errors.root?.server?.message
      : location.formState.errors.root?.server?.message;
  function close() {
    if (!pending.current && !busy) onClose();
  }
  function skip() {
    if (pending.current || busy) return;
    if (step === 1) setStep(2);
    else onClose();
  }
  async function savePersonal(values: PersonalDetailsValues) {
    if (
      pending.current ||
      !values.preferred_language ||
      !values.preferred_units
    )
      return;
    pending.current = true;
    personal.clearErrors("root");
    try {
      const result = await updatePersonalDetails({
        ...values,
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        preferred_language: values.preferred_language,
        preferred_units: values.preferred_units,
      });
      if (!result.success || !result.data) {
        for (const field of [
          "first_name",
          "last_name",
          "preferred_language",
          "preferred_units",
        ] as const) {
          if (result.errors?.[field]?.[0])
            personal.setError(field, {
              type: "server",
              message: result.errors[field][0],
            });
        }
        const message = result.message || t("feedback.saveFailed");
        personal.setError("root.server", { message });
        toast.error(message);
        return;
      }
      setAuth(result.data);
      toast.success(result.message || t("feedback.personalSaved"));
      setPersonalSaved(true);
      setStep(2);
    } catch {
      personal.setError("root.server", { message: t("feedback.saveFailed") });
      toast.error(t("feedback.saveFailed"));
    } finally {
      pending.current = false;
    }
  }
  async function saveLocation(values: LocationDetailsValues) {
    if (pending.current) return;
    pending.current = true;
    location.clearErrors("root");
    try {
      const result = await updateLocationDetails({
        state_id: Number(values.state_id),
        district_id: Number(values.district_id),
        village: values.village.trim(),
        address: values.address || null,
        pincode: values.pincode || null,
      });
      if (!result.success || !result.data) {
        for (const field of [
          "state_id",
          "district_id",
          "village",
          "address",
          "pincode",
        ] as const) {
          if (result.errors?.[field]?.[0])
            location.setError(field, {
              type: "server",
              message: result.errors[field][0],
            });
        }
        const message = result.message || t("feedback.saveFailed");
        location.setError("root.server", { message });
        toast.error(message);
        return;
      }
      setAuth(result.data);
      toast.success(result.message || t("feedback.saved"));
      onClose();
    } catch {
      location.setError("root.server", { message: t("feedback.saveFailed") });
      toast.error(t("feedback.saveFailed"));
    } finally {
      pending.current = false;
    }
  }
  return (
    <Dialog open onClose={close} className="relative z-99999">
      <DialogBackdrop className="fixed inset-0 bg-gray-900/45 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-6">
        <DialogPanel className="shadow-theme-xl flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-gray-900">
          <header className="flex shrink-0 items-center justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-gray-950 dark:text-white">
              <SproutIcon
                aria-hidden="true"
                className="text-success-700 dark:text-success-400 size-8"
              />
              {t("update")}
            </DialogTitle>
            <button
              type="button"
              onClick={close}
              disabled={busy}
              aria-label={t("close")}
              className="text-success-800 hover:bg-success-50 focus-visible:outline-success-600 dark:text-success-300 flex size-9 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 disabled:opacity-50 dark:hover:bg-gray-800"
            >
              <CloseLineIcon
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-6"
              />
            </button>
          </header>
          <Description className="sr-only">
            {t("dialogDescription")}
          </Description>
          <ProfileStepIndicator step={step} personalSaved={personalSaved} />
          <form
            noValidate
            aria-busy={busy}
            onSubmit={(event) =>
              step === 1
                ? personal.handleSubmit(savePersonal)(event)
                : location.handleSubmit(saveLocation)(event)
            }
            className="flex min-h-0 flex-col"
          >
            <div className="min-h-0 overflow-y-auto px-5 pb-5 sm:px-6">
              {error && (
                <p
                  role="alert"
                  className="bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-300 mb-4 rounded-lg px-4 py-3 text-sm"
                >
                  {error}
                </p>
              )}
              <div className="grid gap-4 lg:grid-cols-5">
                <div className="rounded-2xl border border-gray-200 p-4 lg:col-span-3 dark:border-gray-700">
                  {step === 1 ? (
                    <PersonalDetailsStep
                      form={personal}
                      user={user}
                      disabled={busy}
                    />
                  ) : (
                    <LocationDetailsStep
                      form={location}
                      profile={user.farmer_profile}
                      disabled={busy}
                    />
                  )}
                </div>
                <aside className="from-success-50 to-success-100/60 dark:from-success-950 hidden flex-col items-center justify-center rounded-2xl bg-linear-to-br px-5 py-8 text-center lg:col-span-2 lg:flex dark:to-gray-800">
                  <div className="bg-success-100 dark:bg-success-900 relative mb-7 flex size-44 items-center justify-center overflow-visible rounded-full">
                    <FarmLandscapeIcon
                      aria-hidden="true"
                      viewBox="0 0 280 150"
                      className="text-success-500 absolute inset-0 h-full w-full rounded-full"
                    />
                    {step === 1 ? (
                      <>
                        <span
                          aria-hidden="true"
                          className="border-success-600 text-success-700 to-success-100 dark:to-success-950 dark:text-success-300 relative flex size-32 items-center justify-center rounded-full border-2 bg-linear-to-br from-white text-4xl font-bold dark:from-gray-900"
                        >
                          {initials}
                        </span>
                        <span className="bg-success-700 absolute end-0 bottom-0 rounded-2xl border-4 border-white p-2 text-white dark:border-gray-900">
                          <ShieldCheckIcon
                            aria-hidden="true"
                            className="size-10"
                          />
                        </span>
                      </>
                    ) : (
                      <LocationPinIcon
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="text-success-700 dark:text-success-300 relative -mt-12 size-20 [&_path]:stroke-current"
                      />
                    )}
                  </div>
                  <h3 className="text-success-900 dark:text-success-300 text-xl font-bold">
                    {step === 1
                      ? t("illustrations.personalTitle")
                      : t("illustrations.locationTitle")}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                    {step === 1
                      ? t("illustrations.personalDescription")
                      : t("illustrations.locationDescription")}
                  </p>
                </aside>
              </div>
            </div>
            <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-gray-200 bg-white p-4 sm:px-6 dark:border-gray-700 dark:bg-gray-900">
              {step === 2 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStep(1)}
                  className="border-success-700 text-success-800 hover:bg-success-50 focus-visible:outline-success-600 dark:text-success-300 me-auto inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 font-semibold focus-visible:outline-2 disabled:opacity-50 dark:hover:bg-gray-800"
                >
                  <ChevronLeftIcon
                    aria-hidden="true"
                    className="size-5 rtl:rotate-180"
                  />
                  {t("previous")}
                </button>
              )}
              <button
                type="button"
                onClick={skip}
                disabled={busy}
                className="text-success-700 hover:text-success-800 focus-visible:outline-success-600 dark:text-success-300 rounded px-2 py-2 text-sm font-medium underline underline-offset-4 focus-visible:outline-2 disabled:opacity-50"
              >
                {t("skip")}
              </button>
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="border-success-700 text-success-800 hover:bg-success-50 focus-visible:outline-success-600 dark:text-success-300 rounded-xl border px-5 py-2.5 font-semibold focus-visible:outline-2 disabled:opacity-50 dark:hover:bg-gray-800"
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                disabled={busy}
                className="bg-success-700 hover:bg-success-800 focus-visible:outline-success-600 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
              >
                {step === 2 && !busy && (
                  <CheckLineIcon aria-hidden="true" className="size-5" />
                )}
                {busy ? t("saving") : step === 1 ? t("next") : t("save")}
                {step === 1 && (
                  <ArrowRightIcon
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="size-5 rtl:rotate-180"
                  />
                )}
              </button>
            </footer>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
