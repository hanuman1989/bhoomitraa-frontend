"use client";
import {
  startTransition,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  Description,
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import {
  AlertIcon,
  CheckLineIcon,
  CloseLineIcon,
  InfoIcon,
  LocationPinIcon,
  LockIcon,
  PencilIcon,
  RouteIcon,
} from "@/icons";
import { cn } from "@/utils";
import {
  createIrrigationAsset,
  updateIrrigationAsset,
} from "@/actions/account/irrigation";
import type {
  CreateIrrigationAssetInput,
  IrrigationAsset,
  IrrigationAssetType,
  IrrigationGeometry,
  IrrigationOptions,
  IrrigationSourceType,
  UpdateIrrigationAssetInput,
} from "@/types/account/irrigation";
import { useAccountFarms } from "../../_components/AccountFarmContext";
import CropConfirmDialog from "../../crops/_components/CropConfirmDialog";
import {
  IRRIGATION_LIMITS,
  irrigationFormDefaults,
  irrigationFormFields,
  irrigationNumberError,
  irrigationPayload,
  supportsDepth,
  type IrrigationFormValues,
} from "./irrigationForm";
import { routeLengthMeters } from "./irrigationMap";
import {
  IrrigationTypeIcon,
  irrigationButton,
  irrigationControl,
  irrigationGhost,
  irrigationIconButton,
  irrigationPrimary,
  useIrrigationFormat,
} from "./IrrigationUi";

function Field({
  id,
  label,
  required,
  error,
  help,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  help?: string;
  children: ReactNode;
}) {
  const t = useTranslations("farmerIrrigation.form");
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-error-600 ms-1">
            *
          </span>
        ) : (
          <span className="ms-1 text-xs font-normal text-gray-500 dark:text-gray-400">
            ({t("optional")})
          </span>
        )}
      </label>
      {children}
      {help && (
        <p
          id={`${id}-help`}
          className="mt-1 text-xs text-gray-500 dark:text-gray-400"
        >
          {help}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-error-600 dark:text-error-400 mt-1 text-sm"
        >
          {error}
        </p>
      )}
    </div>
  );
}
function Note({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="bg-warning-50 text-warning-800 dark:bg-warning-950 dark:text-warning-200 flex items-start gap-2 rounded-lg px-3 py-2 text-sm"
    >
      <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
function UnitInput({
  unit,
  ...props
}: ComponentProps<"input"> & { unit: string }) {
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        {...props}
        className={cn(irrigationControl, "pe-12")}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400"
      >
        {unit}
      </span>
    </div>
  );
}

/**
 * Add or edit a water source or pipeline. The category comes from the button
 * that opened it and is locked when editing. A location is picked on the
 * dashboard map: the dialog hides meanwhile, and nothing is saved until Save.
 */
export default function IrrigationFormDialog({
  category,
  asset,
  options,
  startEditor = false,
  onClose,
  onSaved,
}: {
  category: IrrigationAssetType;
  asset: IrrigationAsset | null;
  options: IrrigationOptions;
  /** Opens the map editor straight away ("Add location" / "Edit route"). */
  startEditor?: boolean;
  onClose: () => void;
  onSaved: (asset: IrrigationAsset) => void;
}) {
  const t = useTranslations("farmerIrrigation");
  const { irrigation } = useAccountFarms();
  const format = useIrrigationFormat();
  const source = category === "source";
  const id = useId();
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    setError,
    clearErrors,
    control,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<IrrigationFormValues>({
    defaultValues: irrigationFormDefaults(category, asset),
  });
  const mapReady = irrigation.mapStatus === "ready";
  // Opened by "Add location" or "Edit route": go straight to the map.
  const [editing, setEditing] = useState(() => startEditor && mapReady);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [depthNote, setDepthNote] = useState("");
  const geometry = useWatch({ control, name: "geometry" });
  const sourceType = useWatch({ control, name: "source_type" });
  const hadLocation = Boolean(asset?.geometry);
  const numberRule = (maximum: number, applies: () => boolean) => ({
    validate: (value: string) => {
      if (!applies()) return true;
      const problem = irrigationNumberError(value, maximum);
      return problem ? t(`validation.${problem}`) : true;
    },
  });

  function requestEditor() {
    return irrigation.editLocation({
      kind: source ? "point" : "line",
      assetId: asset?.id ?? null,
      geometry: getValues("geometry"),
      onConfirm: (next: IrrigationGeometry | null) => {
        setValue("geometry", next, { shouldDirty: true });
        clearErrors("geometry");
        // The earlier manual length no longer applies once a route is drawn or removed.
        if (!source) setValue("length_meters", "", { shouldDirty: true });
        setEditing(false);
      },
      onCancel: () => setEditing(false),
    });
  }
  function openEditor() {
    if (requestEditor()) setEditing(true);
  }
  const editorRequested = useRef(false);
  useEffect(() => {
    if (!startEditor || editorRequested.current) return;
    editorRequested.current = true;
    // If the map can't take the edit, show the form instead.
    startTransition(() => {
      if (!requestEditor()) setEditing(false);
    });
  });

  function removeGeometry() {
    setValue("geometry", null, { shouldDirty: true });
    if (!source) setValue("length_meters", "", { shouldDirty: true });
  }
  function requestClose() {
    if (isSubmitting) return;
    if (isDirty) setConfirmDiscard(true);
    else onClose();
  }

  const submit = handleSubmit(
    async (values) => {
      const payload = irrigationPayload(category, values, options, asset);
      const result = asset
        ? await updateIrrigationAsset(
            asset.id,
            payload as UpdateIrrigationAssetInput,
          )
        : await createIrrigationAsset(payload as CreateIrrigationAssetInput);
      if (result.success && result.data) {
        toast.success(result.message || t("toasts.saved"));
        onSaved(result.data);
        return;
      }
      const fields = Object.entries(result.errors ?? {}).filter(([field]) =>
        (irrigationFormFields as readonly string[]).includes(field),
      );
      for (const [field, messages] of fields)
        setError(field as (typeof irrigationFormFields)[number], {
          type: "server",
          message: messages.join(" "),
        });
      if (fields.length)
        setError("root.server", {
          type: "server",
          message: t("form.fixFields"),
        });
      else {
        // Entries stay in the form so the farmer can retry.
        setError("root.server", {
          type: "server",
          message: result.message || t("errors.saveFailed"),
        });
        toast.error(result.message || t("errors.saveFailed"));
      }
    },
    () =>
      setError("root.server", { type: "client", message: t("form.fixFields") }),
  );

  const typeOptions = source ? options.source_types : options.pipeline_types;
  const typeField = source ? "source_type" : "pipeline_type";
  const typeError = errors[typeField]?.message;
  const showDepth = source && supportsDepth(options, sourceType);
  const title = t(
    source
      ? asset
        ? "form.editSource"
        : "form.addSource"
      : asset
        ? "form.editPipeline"
        : "form.addPipeline",
  );
  const categoryLabel =
    options.asset_types.find((option) => option.key === category)?.label ??
    t(source ? "categories.source" : "categories.pipeline");
  const errorFor = (field: keyof IrrigationFormValues) =>
    errors[field]?.message
      ? { "aria-invalid": true, "aria-describedby": `${id}-${field}-error` }
      : {};

  return (
    <>
      <Dialog
        open={!editing}
        onClose={requestClose}
        className="relative z-99999"
      >
        <DialogBackdrop className="fixed inset-0 bg-gray-950/45 backdrop-blur-sm" />
        <div className="fixed inset-0 flex justify-center md:items-center md:p-5">
          <DialogPanel
            as="form"
            noValidate
            onSubmit={submit}
            aria-busy={isSubmitting}
            className="shadow-theme-xl flex h-full w-full flex-col bg-white text-gray-900 md:h-auto md:max-h-[calc(100dvh-2.5rem)] md:max-w-2xl md:rounded-2xl dark:bg-gray-900 dark:text-gray-100"
          >
            <header className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 pt-5 pb-3 dark:border-gray-700">
              <div className="min-w-0">
                <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
                <Description className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {asset ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      <LockIcon aria-hidden="true" className="size-3.5" />
                      {t("form.categoryLocked", { category: categoryLabel })}
                    </span>
                  ) : (
                    categoryLabel
                  )}
                </Description>
              </div>
              <button
                type="button"
                aria-label={t("actions.close")}
                onClick={requestClose}
                className={cn(irrigationIconButton, "-me-2 -mt-1")}
              >
                <CloseLineIcon aria-hidden="true" className="size-5" />
              </button>
            </header>
            <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {errors.root?.server?.message && (
                <p
                  role="alert"
                  className="bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-300 flex items-start gap-2 rounded-lg px-3 py-2 text-sm"
                >
                  <AlertIcon
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0"
                  />
                  {errors.root.server.message}
                </p>
              )}
              <fieldset
                aria-describedby={typeError ? `${id}-type-error` : undefined}
              >
                <legend className="mb-1.5 text-sm font-semibold">
                  {t(source ? "form.sourceType" : "form.pipelineType")}
                  <span aria-hidden="true" className="text-error-600 ms-1">
                    *
                  </span>
                </legend>
                <div
                  className={`grid grid-cols-2 gap-2 ${source ? "sm:grid-cols-3" : "sm:grid-cols-4"}`}
                >
                  {typeOptions.map((option) => {
                    return (
                      <label key={option.key} className="relative">
                        <input
                          type="radio"
                          value={option.key}
                          className="peer sr-only"
                          {...register(typeField, {
                            required: t("validation.typeRequired"),
                            onChange: (event) => {
                              if (!source) return;
                              const next = event.target.value as string;
                              const depth = getValues("depth_meters").trim();
                              if (supportsDepth(options, next) || !depth) {
                                setDepthNote("");
                                return;
                              }
                              setDepthNote(
                                t("form.depthCleared", {
                                  type:
                                    options.source_types.find(
                                      (type) => type.key === next,
                                    )?.label ?? next,
                                  value: format.trimmed(depth),
                                }),
                              );
                              setValue("depth_meters", "", {
                                shouldDirty: true,
                              });
                              clearErrors("depth_meters");
                            },
                          })}
                        />
                        <span className="peer-checked:border-blue-light-600 peer-checked:bg-blue-light-50 peer-checked:text-blue-light-800 peer-focus-visible:outline-success-600 dark:peer-checked:bg-blue-light-950 dark:peer-checked:text-blue-light-200 flex min-h-19 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white p-2.5 text-center text-sm leading-tight font-medium transition peer-checked:font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900">
                          <IrrigationTypeIcon
                            assetType={category}
                            sourceType={
                              source
                                ? (option.key as IrrigationSourceType)
                                : null
                            }
                            className="text-blue-light-600 dark:text-blue-light-400 size-5"
                          />
                          {option.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {typeError && (
                  <p
                    id={`${id}-type-error`}
                    role="alert"
                    className="text-error-600 dark:text-error-400 mt-1 text-sm"
                  >
                    {typeError}
                  </p>
                )}
              </fieldset>
              {depthNote && <Note>{depthNote}</Note>}
              <Field
                id={`${id}-name`}
                label={t("form.name")}
                required
                error={errors.name?.message}
              >
                <input
                  id={`${id}-name`}
                  type="text"
                  autoComplete="off"
                  placeholder={t(
                    source
                      ? "form.namePlaceholderSource"
                      : "form.namePlaceholderPipeline",
                  )}
                  {...errorFor("name")}
                  {...register("name", {
                    validate: (value) =>
                      !value.trim()
                        ? t("validation.nameRequired")
                        : value.trim().length > IRRIGATION_LIMITS.name
                          ? t("validation.nameMax")
                          : true,
                  })}
                  className={irrigationControl}
                />
              </Field>
              {source ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {showDepth && (
                    <Field
                      id={`${id}-depth_meters`}
                      label={t("form.depth")}
                      error={errors.depth_meters?.message}
                      help={t("form.depthHelp")}
                    >
                      <UnitInput
                        id={`${id}-depth_meters`}
                        unit={t("units.m")}
                        {...errorFor("depth_meters")}
                        {...register(
                          "depth_meters",
                          numberRule(IRRIGATION_LIMITS.depth, () =>
                            supportsDepth(options, getValues("source_type")),
                          ),
                        )}
                      />
                    </Field>
                  )}
                  <Field
                    id={`${id}-water_availability`}
                    label={t("form.availability")}
                    error={errors.water_availability?.message}
                    help={t("form.availabilityHelp")}
                  >
                    <select
                      id={`${id}-water_availability`}
                      {...errorFor("water_availability")}
                      {...register("water_availability")}
                      className={irrigationControl}
                    >
                      <option value="">{t("form.notSpecified")}</option>
                      {options.water_availability.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id={`${id}-diameter_mm`}
                    label={t("form.diameter")}
                    error={errors.diameter_mm?.message}
                  >
                    <UnitInput
                      id={`${id}-diameter_mm`}
                      unit={t("units.mm")}
                      {...errorFor("diameter_mm")}
                      {...register(
                        "diameter_mm",
                        numberRule(IRRIGATION_LIMITS.diameter, () => true),
                      )}
                    />
                  </Field>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id={`${id}-ownership_type`}
                  label={t("form.ownership")}
                  error={errors.ownership_type?.message}
                >
                  <select
                    id={`${id}-ownership_type`}
                    {...errorFor("ownership_type")}
                    {...register("ownership_type")}
                    className={irrigationControl}
                  >
                    <option value="">{t("form.notSpecified")}</option>
                    {options.ownership_types.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  id={`${id}-status`}
                  label={t("form.status")}
                  required
                  error={errors.status?.message}
                >
                  <select
                    id={`${id}-status`}
                    {...errorFor("status")}
                    {...register("status", {
                      required: t("validation.statusRequired"),
                    })}
                    className={irrigationControl}
                  >
                    {options.statuses.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <section
                aria-labelledby={`${id}-location`}
                className="rounded-xl border border-dashed border-gray-300 p-4 dark:border-gray-600"
              >
                <h3
                  id={`${id}-location`}
                  className="flex items-center gap-2 text-sm font-semibold"
                >
                  {source ? (
                    <LocationPinIcon aria-hidden="true" className="size-4" />
                  ) : (
                    <RouteIcon aria-hidden="true" className="size-4" />
                  )}
                  {t(source ? "form.locationTitle" : "form.routeTitle")}
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                    ({t("form.optional")})
                  </span>
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t(source ? "form.locationHelp" : "form.routeHelp")}
                </p>
                <p
                  aria-live="polite"
                  className={`mt-3 flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-sm ${geometry ? "bg-blue-light-50 text-blue-light-800 dark:bg-blue-light-950 dark:text-blue-light-200" : "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}
                >
                  {geometry?.type === "Point" ? (
                    <>
                      <span>{t("details.locationSet")}</span>
                      <span
                        dir="ltr"
                        className="font-mono text-xs tabular-nums"
                      >
                        {t("form.latLng", {
                          lat: format.coordinate(geometry.coordinates[1]),
                          lng: format.coordinate(geometry.coordinates[0]),
                        })}
                      </span>
                    </>
                  ) : geometry?.type === "LineString" ? (
                    t("details.routeSet", {
                      count: geometry.coordinates.length,
                    })
                  ) : (
                    t(source ? "details.noLocation" : "details.noRoute")
                  )}
                </p>
                {!geometry && hadLocation && (
                  <div className="mt-2">
                    <Note>
                      {t(source ? "form.locationRemoved" : "form.routeRemoved")}
                    </Note>
                  </div>
                )}
                {!mapReady && (
                  <div className="mt-2">
                    <Note>{t("form.mapUnavailable")}</Note>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!mapReady}
                    onClick={openEditor}
                    className={irrigationButton}
                  >
                    {geometry ? (
                      <PencilIcon aria-hidden="true" className="size-4" />
                    ) : source ? (
                      <LocationPinIcon aria-hidden="true" className="size-4" />
                    ) : (
                      <RouteIcon aria-hidden="true" className="size-4" />
                    )}
                    {t(
                      source
                        ? geometry
                          ? "form.changeLocation"
                          : "form.pickLocation"
                        : geometry
                          ? "actions.editRoute"
                          : "form.drawRoute",
                    )}
                  </button>
                  {geometry && (
                    <button
                      type="button"
                      onClick={removeGeometry}
                      className={irrigationGhost}
                    >
                      <CloseLineIcon aria-hidden="true" className="size-4" />
                      {t(source ? "form.removeLocation" : "form.removeRoute")}
                    </button>
                  )}
                </div>
                {errors.geometry?.message && (
                  <p
                    role="alert"
                    className="text-error-600 dark:text-error-400 mt-2 text-sm"
                  >
                    {errors.geometry.message}
                  </p>
                )}
                {!source && geometry?.type === "LineString" && (
                  <div className="mt-3">
                    <p className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                      <span>{t("form.calculatedLength")}</span>
                      <strong className="text-base tabular-nums">
                        {t("form.approximate", {
                          length: format.fixed(
                            routeLengthMeters(geometry.coordinates),
                          ),
                        })}
                      </strong>
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {t("form.calculatedLengthHelp")}
                    </p>
                  </div>
                )}
                {!source && !geometry && (
                  <div className="mt-3">
                    <Field
                      id={`${id}-length_meters`}
                      label={t("form.length")}
                      error={errors.length_meters?.message}
                      help={t("form.lengthHelp")}
                    >
                      <UnitInput
                        id={`${id}-length_meters`}
                        unit={t("units.m")}
                        {...errorFor("length_meters")}
                        {...register(
                          "length_meters",
                          numberRule(
                            IRRIGATION_LIMITS.length,
                            () => !getValues("geometry"),
                          ),
                        )}
                      />
                    </Field>
                  </div>
                )}
              </section>
              <Field
                id={`${id}-notes`}
                label={t("form.notes")}
                error={errors.notes?.message}
              >
                <textarea
                  id={`${id}-notes`}
                  rows={3}
                  placeholder={t("form.notesPlaceholder")}
                  {...errorFor("notes")}
                  {...register("notes", {
                    validate: (value) =>
                      value.trim().length > IRRIGATION_LIMITS.notes
                        ? t("validation.notesMax")
                        : true,
                  })}
                  className={cn(irrigationControl, "h-auto min-h-20 py-2.5")}
                />
              </Field>
            </div>
            <footer className="flex justify-end gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-700">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={requestClose}
                className={irrigationButton}
              >
                {t("actions.cancel")}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={irrigationPrimary}
              >
                <CheckLineIcon aria-hidden="true" className="size-4" />
                {isSubmitting
                  ? t("form.saving")
                  : t(asset ? "form.saveChanges" : "form.save")}
              </button>
            </footer>
          </DialogPanel>
        </div>
      </Dialog>
      {confirmDiscard && (
        <CropConfirmDialog
          title={t("form.discardTitle")}
          description={t("form.discardDescription")}
          confirmLabel={t("form.discard")}
          cancelLabel={t("form.keepEditing")}
          danger
          onClose={() => setConfirmDiscard(false)}
          onConfirm={onClose}
        />
      )}
    </>
  );
}
