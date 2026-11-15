"use client";
import { useEffect, useRef, useState, startTransition } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Description,
} from "@headlessui/react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { saveFarmerFarm } from "@/actions/account/farms";
import useFarmBoundary from "@/hooks/useFarmBoundary";
import useAreaUnits from "@/hooks/useAreaUnits";
import { canonicalAreaUnit, resolvePreferredAreaUnit } from "@/lib/areaUnits";
import BoundaryConfirmDialog from "@/components/common/maps/BoundaryConfirmDialog";
import {
  ArrowRightIcon,
  CheckLineIcon,
  ChevronLeftIcon,
  CloseLineIcon,
  SproutIcon,
} from "@/icons";
import type { FarmerProfile } from "@/lib/userAuth/types";
import type {
  BoundaryDraft,
  Farm,
  FarmBasicPayload,
} from "@/types/account/farm";
import {
  boundaryError,
  boundaryPoints,
} from "@/app/[locale]/(account)/account/(protected)/_components/farmGeometry";
import FarmStepper from "./FarmStepper";
import FarmInformationStep from "./FarmInformationStep";
import FarmLocationStep, { type FarmLocationLabels } from "./FarmLocationStep";
import FarmBoundaryStep from "./FarmBoundaryStep";
import FarmReviewStep from "./FarmReviewStep";
import FarmIllustration from "./FarmIllustration";
import {
  farmButton,
  farmPrimaryButton,
  informationFields,
  locationFields,
  type FarmFormValues,
} from "./farmFormTypes";

export default function AddFarmDialog({
  profile,
  farm,
  initialBoundary,
  onClose,
  onSaved,
}: {
  profile: FarmerProfile | null;
  farm?: Farm;
  initialBoundary?: BoundaryDraft;
  onClose: () => void;
  onSaved: (farm: Farm) => void;
}) {
  const t = useTranslations("farmerFarms");
  const metadata = useAreaUnits();
  const unitInitialized = useRef(false);
  const [step, setStep] = useState(0),
    [reached, setReached] = useState(farm ? 3 : 0),
    [visitedBoundary, setVisitedBoundary] = useState(false);
  const [boundarySkipped, setBoundarySkipped] = useState(false);
  const [busy, setBusy] = useState(false),
    [discard, setDiscard] = useState(false),
    [skip, setSkip] = useState(false);
  const [location, setLocation] = useState<FarmLocationLabels>({
    label: "",
    state: "",
    district: "",
    tehsil: "",
  });
  const [originalProfile] = useState(profile);
  const pending = useRef(false);
  const content = useRef<HTMLDivElement>(null);
  const creation = useRef<string | null>(null);
  const [savedBoundary] = useState<BoundaryDraft>(() => ({
    boundary: farm?.boundary ?? null,
    boundary_source: farm?.boundary_source ?? null,
    gps_accuracy_m:
      farm?.gps_accuracy_m == null ? null : Number(farm.gps_accuracy_m),
  }));
  const session = useFarmBoundary(
    farm ? savedBoundary : initialBoundary,
    farm?.actual_area_sqm,
  );
  const form = useForm<FarmFormValues>({
    mode: "onTouched",
    defaultValues: {
      name: farm?.name ?? "",
      description: farm?.description ?? "",
      ownership_type: farm?.ownership_type ?? "",
      area: farm?.area ?? "",
      area_unit: farm
        ? canonicalAreaUnit(farm.area_unit)
        : (resolvePreferredAreaUnit(
            originalProfile?.preferred_units,
            metadata.config,
          ) ?? ""),
      state_id: String(farm?.state_id ?? profile?.state_id ?? ""),
      district_id: String(farm?.district_id ?? profile?.district_id ?? ""),
      tehsil_id: String(farm?.tehsil_id ?? ""),
      village: farm?.village ?? profile?.village ?? "",
      address: farm?.address ?? "",
    },
  });
  const { getFieldState, resetField } = form;
  useEffect(() => {
    if (farm || !metadata.config || unitInitialized.current) return;
    unitInitialized.current = true;
    if (!getFieldState("area_unit").isDirty)
      resetField("area_unit", {
        defaultValue:
          resolvePreferredAreaUnit(
            originalProfile?.preferred_units,
            metadata.config,
          ) ?? "",
      });
  }, [farm, metadata.config, originalProfile, getFieldState, resetField]);
  const values = useWatch({ control: form.control }) as FarmFormValues;
  useEffect(() => {
    content.current?.scrollTo({ top: 0 });
  }, [step]);
  function close() {
    if (pending.current) return;
    session.pause();
    const savedPoints = boundaryPoints(savedBoundary.boundary);
    const boundaryChanged =
      session.points.length !== savedPoints.length ||
      session.points.some(
        (point, index) =>
          point.lat !== savedPoints[index].lat ||
          point.lng !== savedPoints[index].lng,
      ) ||
      (session.points.length > 0 &&
        (session.source !== savedBoundary.boundary_source ||
          (session.source === "gps" &&
            session.accuracy !== savedBoundary.gps_accuracy_m)));
    if (form.formState.isDirty || boundaryChanged) setDiscard(true);
    else onClose();
  }
  function move(next: number) {
    setStep(next);
    setReached((current) => Math.max(current, next));
    if (next === 2) setVisitedBoundary(true);
  }
  async function go(next: number) {
    if (pending.current || session.active || next < 0 || next > 3) return;
    if (!farm && next > step) {
      if (
        next >= 1 &&
        !(await form.trigger([...informationFields], { shouldFocus: true }))
      ) {
        move(0);
        return;
      }
      if (
        next >= 2 &&
        !(await form.trigger([...locationFields], { shouldFocus: true }))
      ) {
        move(1);
        return;
      }
      if (
        next >= 3 &&
        !session.boundary &&
        (!boundarySkipped || session.points.length > 0)
      ) {
        session.setNotice("finishOrSkipBoundary");
        move(2);
        return;
      }
    }
    move(next);
  }
  function skipBoundary() {
    if (session.active) return;
    if (session.points.length) {
      setSkip(true);
      return;
    }
    session.clear();
    setBoundarySkipped(true);
    move(3);
  }
  async function save() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      if (
        !(await form.trigger([...informationFields], { shouldFocus: true }))
      ) {
        move(0);
        return;
      }
      if (!(await form.trigger([...locationFields], { shouldFocus: true }))) {
        move(1);
        return;
      }
      if (
        session.active ||
        (session.points.length &&
          (!session.boundary || boundaryError(session.points)))
      ) {
        move(2);
        session.setNotice("finishOrSkipBoundary");
        return;
      }
      const current = form.getValues();
      if (!current.area_unit) return;
      const payload: FarmBasicPayload & BoundaryDraft = {
        name: current.name.trim(),
        description: current.description || null,
        ownership_type: current.ownership_type || null,
        area: current.area,
        area_unit: current.area_unit,
        state_id: Number(current.state_id),
        district_id: Number(current.district_id),
        tehsil_id: current.tehsil_id ? Number(current.tehsil_id) : null,
        village: current.village.trim(),
        address: current.address || null,
        ...session.draft,
      };
      // Keep one key for the dialog, including corrections after an uncertain save.
      creation.current ??= crypto.randomUUID();
      form.clearErrors("root");
      const result = await saveFarmerFarm(payload, creation.current, farm?.id);
      if (!result.success || !result.data) {
        const fields = [...informationFields, ...locationFields];
        for (const field of fields)
          if (result.errors?.[field]?.[0])
            form.setError(field, {
              type: "server",
              message: result.errors[field][0],
            });
        if (informationFields.some((field) => result.errors?.[field])) move(0);
        else if (locationFields.some((field) => result.errors?.[field]))
          move(1);
        else if (
          Object.keys(result.errors ?? {}).some((field) =>
            /^(boundary|gps_accuracy_m)/.test(field),
          )
        ) {
          move(2);
          session.setNotice("backendBoundaryRejected");
        }
        const message = result.message || t("saveFailed");
        form.setError("root.server", { message });
        toast.error(message);
        return;
      }
      toast.success(result.message || t(farm ? "updated" : "created"));
      session.pause();
      onSaved(result.data);
    } catch {
      form.setError("root.server", { message: t("saveFailed") });
      toast.error(t("saveFailed"));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog open onClose={close} className="relative z-9999">
      <DialogBackdrop className="fixed inset-0 bg-gray-950/40 backdrop-blur-xs" />
      <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-5">
        <DialogPanel className="shadow-theme-xl flex h-full max-h-220 w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white text-gray-950 dark:bg-gray-900 dark:text-gray-100">
          <header className="flex shrink-0 items-start gap-4 px-5 pt-5 sm:px-7">
            <SproutIcon
              aria-hidden="true"
              className="text-success-700 mt-1 size-10"
            />
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold sm:text-3xl">
                {t(farm ? "editFarm" : "wizard.title")}
              </DialogTitle>
              <Description className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">
                {t(farm ? "wizard.editSubtitle" : "wizard.subtitle")}
              </Description>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={close}
              aria-label={t("close")}
              className="text-success-700 hover:bg-success-50 dark:text-success-300 rounded-lg p-1 disabled:opacity-40 dark:hover:bg-gray-800"
            >
              <CloseLineIcon className="size-7" />
            </button>
          </header>
          <FarmStepper
            isEditing={Boolean(farm)}
            step={step}
            reached={reached}
            onStep={(next) => void go(next)}
            disabled={busy || session.active}
          />
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              if (step === 3) startTransition(() => void save());
              else void go(step + 1);
            }}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div
              ref={content}
              className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-6"
            >
              <fieldset disabled={busy} className="min-w-0">
                <div
                  hidden={step !== 0}
                  className={
                    step === 0 ? "grid gap-4 lg:grid-cols-7" : "hidden"
                  }
                >
                  <div className="lg:col-span-5">
                    <FarmInformationStep form={form} farm={farm} />
                  </div>
                  <div className="hidden lg:col-span-2 lg:grid">
                    <FarmIllustration />
                  </div>
                </div>
                <div
                  hidden={step !== 1}
                  className={
                    step === 1 ? "grid gap-4 lg:grid-cols-7" : "hidden"
                  }
                >
                  <div className="lg:col-span-5">
                    <FarmLocationStep
                      form={form}
                      profile={originalProfile}
                      farm={farm}
                      onLocation={setLocation}
                      hasBoundary={session.points.length > 0}
                    />
                  </div>
                  <div className="hidden lg:col-span-2 lg:grid">
                    <FarmIllustration location />
                  </div>
                </div>
                {visitedBoundary && (
                  <div hidden={step !== 2}>
                    <FarmBoundaryStep
                      session={session}
                      areaUnit={values.area_unit}
                      location={location.label}
                    />
                  </div>
                )}
                {step === 3 && (
                  <FarmReviewStep
                    values={form.getValues()}
                    location={location}
                    session={session}
                    onEdit={(next) => void go(next)}
                  />
                )}
                {form.formState.errors.root?.server?.message && (
                  <p
                    role="alert"
                    className="bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-200 mt-3 rounded-xl p-3 text-sm"
                  >
                    {form.formState.errors.root.server.message}
                  </p>
                )}
              </fieldset>
            </div>
            <footer className="flex shrink-0 flex-wrap items-center gap-3 border-t border-gray-200 bg-white px-4 py-3 sm:px-6 dark:border-gray-700 dark:bg-gray-900">
              {step > 0 && (
                <button
                  type="button"
                  disabled={busy || session.active}
                  onClick={() => void go(step - 1)}
                  className={farmButton}
                >
                  <ChevronLeftIcon className="size-5 rtl:rotate-180" />
                  {t("wizard.previous")}
                </button>
              )}
              <div className="ms-auto flex flex-wrap justify-end gap-3">
                {step === 2 && (
                  <button
                    type="button"
                    disabled={busy || session.active}
                    onClick={skipBoundary}
                    className="px-2 text-sm text-gray-500 underline disabled:opacity-40"
                  >
                    {t("skipBoundary")}
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={close}
                  className={farmButton}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={busy || session.active}
                  className={farmPrimaryButton}
                >
                  {step === 3 ? (
                    <>
                      <CheckLineIcon className="size-5" />
                      {t(busy ? "saving" : "wizard.save")}
                    </>
                  ) : (
                    <>
                      {t("nextStep", {
                        step: t(
                          `wizard.steps.${["location", "boundary", "review"][step]}`,
                        ),
                      })}
                      <ArrowRightIcon className="size-5 rtl:rotate-180" />
                    </>
                  )}
                </button>
              </div>
            </footer>
          </form>
        </DialogPanel>
      </div>
      {discard && (
        <BoundaryConfirmDialog
          title={t("discardFarmTitle")}
          description={t("discardFarmDescription")}
          onConfirm={onClose}
          onClose={() => setDiscard(false)}
        />
      )}{" "}
      {skip && (
        <BoundaryConfirmDialog
          title={t("discardBoundaryTitle")}
          description={t("discardBoundaryDescription")}
          onConfirm={() => {
            session.clear();
            setBoundarySkipped(true);
            setSkip(false);
            move(3);
          }}
          onClose={() => setSkip(false)}
        />
      )}
    </Dialog>
  );
}
