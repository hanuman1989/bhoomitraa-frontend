"use client";
import { useTranslations } from "next-intl";
import { useUserAuth } from "@/hooks/useUserAuth";
import { useModal } from "@/hooks/useModal";
import useAreaUnits from "@/hooks/useAreaUnits";
import { resolvePreferredAreaUnit } from "@/lib/areaUnits";
import {
  CheckLineIcon,
  FarmFieldIcon,
  HomeIcon,
  LanguageIcon,
  LocationPinIcon,
  MailIcon,
  MapLayersIcon,
  PencilIcon,
  PhoneIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SproutIcon,
  UserIcon,
} from "@/icons";
import UpdateProfileDialog from "./UpdateProfileDialog";

export default function ProfileDetails() {
  const t = useTranslations("farmerProfile");
  const ta = useTranslations("areaUnits");
  const metadata = useAreaUnits();
  const { user } = useUserAuth();
  const { isOpen, openModal, closeModal } = useModal();
  const profile = user?.farmer_profile;
  const name = user
    ? `${user.first_name} ${user.last_name}`.trim() || t("empty")
    : t("empty");
  const initials =
    [user?.first_name, user?.last_name]
      .map((part) => Array.from(part?.trim() ?? "")[0] ?? "")
      .join("")
      .toUpperCase() || "?";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-2xl font-bold text-gray-950 dark:text-white">
          <SproutIcon
            aria-hidden="true"
            className="text-success-700 dark:text-success-400 size-7"
          />
          {t("title")}
        </h2>
        <button
          type="button"
          onClick={openModal}
          disabled={!user}
          className="bg-success-700 hover:bg-success-800 focus-visible:outline-success-600 shadow-theme-sm inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
        >
          <PencilIcon aria-hidden="true" className="size-4" />
          {t("update")}
        </button>
      </div>
      <section
        aria-label={t("account")}
        className="border-success-200 bg-success-50 dark:border-success-900 shadow-theme-xs flex items-center gap-4 overflow-hidden rounded-xl border bg-[url('/images/title-bg.png')] bg-contain bg-right bg-no-repeat px-4 py-2.5 sm:gap-5 sm:px-5 dark:bg-gray-900 dark:bg-blend-soft-light"
      >
        <div
          aria-label={t("avatar", { name })}
          className="border-success-600 shadow-theme-sm size-20 shrink-0 rounded-full border-2 bg-white p-1 sm:size-22 dark:bg-gray-900"
        >
          <div className="from-success-50 to-success-100 text-success-700 dark:from-success-900 dark:to-success-950 dark:text-success-300 flex h-full items-center justify-center rounded-full bg-linear-to-br text-3xl font-bold sm:text-4xl">
            {initials}
          </div>
        </div>
        <div className="min-w-0 space-y-1.5">
          <h3 className="text-lg font-bold break-words text-gray-950 sm:text-xl dark:text-white">
            {name}
          </h3>
          <p className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
            <FarmFieldIcon
              aria-hidden="true"
              className="text-success-600 size-4"
            />
            {t("account")}
          </p>
          <div className="flex flex-wrap gap-2">
            {user && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${user.status ? "bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}
              >
                {user.status && (
                  <CheckLineIcon aria-hidden="true" className="size-3.5" />
                )}
                {user.status ? t("active") : t("inactive")}
              </span>
            )}
            {user?.email_verified_at && (
              <span className="bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold">
                <ShieldCheckIcon aria-hidden="true" className="size-4" />
                {t("verified")}
              </span>
            )}
          </div>
        </div>
      </section>
      <div className="grid gap-5 lg:grid-cols-3">
        <section className="shadow-theme-xs rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-3 flex items-center gap-3 text-lg font-bold text-gray-950 dark:text-white">
            <span className="bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300 flex size-10 shrink-0 items-center justify-center rounded-lg">
              <UserIcon
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="size-6"
              />
            </span>
            {t("personalTitle")}
          </h3>
          <dl className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
            <div className="flex items-start gap-3 py-3">
              <UserIcon
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="text-success-700 dark:text-success-400 size-5 shrink-0"
              />
              <dt className="w-1/3 shrink-0 text-gray-600 dark:text-gray-400">
                {t("fields.name")}
              </dt>
              <dd className="min-w-0 font-semibold break-words text-gray-950 dark:text-white">
                {name}
              </dd>
            </div>
            <div className="flex items-start gap-3 py-3">
              <PhoneIcon
                aria-hidden="true"
                className="text-success-700 dark:text-success-400 size-5 shrink-0"
              />
              <dt className="w-1/3 shrink-0 text-gray-600 dark:text-gray-400">
                {t("fields.mobile")}
              </dt>
              <dd className="min-w-0 font-semibold break-words text-gray-950 dark:text-white">
                {user?.mobile || t("empty")}
              </dd>
            </div>
            <div className="flex items-start gap-3 py-3">
              <MailIcon
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="text-success-700 dark:text-success-400 size-5 shrink-0"
              />
              <dt className="w-1/3 shrink-0 text-gray-600 dark:text-gray-400">
                {t("fields.email")}
              </dt>
              <dd className="min-w-0 font-semibold break-words text-gray-950 dark:text-white">
                {user?.email || t("empty")}
              </dd>
            </div>
          </dl>
        </section>
        <section className="shadow-theme-xs rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-3 flex items-center gap-3 text-lg font-bold text-gray-950 dark:text-white">
            <span className="bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300 flex size-10 shrink-0 items-center justify-center rounded-lg">
              <LocationPinIcon
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-6 [&_path]:stroke-current"
              />
            </span>
            {t("locationTitle")}
          </h3>
          <dl className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
            <div className="flex items-start gap-3 py-3">
              <HomeIcon
                aria-hidden="true"
                className="text-success-700 dark:text-success-400 size-5 shrink-0"
              />
              <dt className="w-1/3 shrink-0 text-gray-600 dark:text-gray-400">
                {t("fields.state")}
              </dt>
              <dd className="min-w-0 font-semibold break-words text-gray-950 dark:text-white">
                {profile?.state?.name || t("empty")}
              </dd>
            </div>
            <div className="flex items-start gap-3 py-3">
              <HomeIcon
                aria-hidden="true"
                className="text-success-700 dark:text-success-400 size-5 shrink-0"
              />
              <dt className="w-1/3 shrink-0 text-gray-600 dark:text-gray-400">
                {t("fields.district")}
              </dt>
              <dd className="min-w-0 font-semibold break-words text-gray-950 dark:text-white">
                {profile?.district?.name || t("empty")}
              </dd>
            </div>
            <div className="flex items-start gap-3 py-3">
              <FarmFieldIcon
                aria-hidden="true"
                className="text-success-700 dark:text-success-400 size-5 shrink-0"
              />
              <dt className="w-1/3 shrink-0 text-gray-600 dark:text-gray-400">
                {t("fields.village")}
              </dt>
              <dd className="min-w-0 font-semibold break-words text-gray-950 dark:text-white">
                {profile?.village || t("empty")}
              </dd>
            </div>
            <div className="flex items-start gap-3 py-3">
              <LocationPinIcon
                aria-hidden="true"
                className="text-success-700 dark:text-success-400 size-5 shrink-0"
              />

              <dt className="w-1/3 shrink-0 text-gray-600 dark:text-gray-400">
                {t("fields.address")}
              </dt>
              <dd className="min-w-0 font-semibold break-words text-gray-950 dark:text-white">
                {profile?.address || t("empty")}
              </dd>
            </div>
            <div className="flex items-start gap-3 py-3">
              <LocationPinIcon
                aria-hidden="true"
                className="text-success-700 dark:text-success-400 size-5 shrink-0"
              />

              <dt className="w-1/3 shrink-0 text-gray-600 dark:text-gray-400">
                {t("fields.pincode")}
              </dt>
              <dd className="min-w-0 font-semibold break-words text-gray-950 dark:text-white">
                {profile?.pincode || t("empty")}
              </dd>
            </div>
          </dl>
        </section>
        <section className="shadow-theme-xs rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-3 flex items-center gap-3 text-lg font-bold text-gray-950 dark:text-white">
            <span className="bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300 flex size-10 shrink-0 items-center justify-center rounded-lg">
              <SettingsIcon aria-hidden="true" className="size-6" />
            </span>
            {t("preferencesTitle")}
          </h3>
          <dl className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
            <div className="flex items-start gap-3 py-3">
              <MapLayersIcon
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="text-success-700 dark:text-success-400 size-5 shrink-0"
              />
              <dt className="w-1/3 shrink-0 text-gray-600 dark:text-gray-400">
                {t("fields.preferredUnits")}
              </dt>
              <dd className="min-w-0 font-semibold text-gray-950 dark:text-white">
                {profile?.preferred_units
                  ? metadata.label(profile.preferred_units)
                  : t("empty")}
                {profile?.preferred_units &&
                  metadata.config &&
                  !resolvePreferredAreaUnit(
                    profile.preferred_units,
                    metadata.config,
                  ) && (
                    <p className="text-warning-700 dark:text-warning-300 mt-1 text-xs font-normal">
                      {ta("legacyHelp")}
                    </p>
                  )}
                {metadata.status === "error" && (
                  <p className="mt-1 text-xs font-normal" role="alert">
                    {ta("loadFailed")}{" "}
                    <button
                      type="button"
                      onClick={metadata.retry}
                      className="underline"
                    >
                      {ta("retry")}
                    </button>
                  </p>
                )}
              </dd>
            </div>
            <div className="flex items-start gap-3 py-3">
              <LanguageIcon
                aria-hidden="true"
                className="text-success-700 dark:text-success-400 size-5 shrink-0"
              />
              <dt className="w-1/3 shrink-0 text-gray-600 dark:text-gray-400">
                {t("fields.preferredLanguage")}
              </dt>
              <dd className="min-w-0 font-semibold text-gray-950 dark:text-white">
                {profile?.preferred_language
                  ? t(`languages.${profile.preferred_language}`)
                  : t("empty")}
              </dd>
            </div>
          </dl>
        </section>
      </div>
      {isOpen && user && (
        <UpdateProfileDialog
          user={user}
          initials={initials}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
