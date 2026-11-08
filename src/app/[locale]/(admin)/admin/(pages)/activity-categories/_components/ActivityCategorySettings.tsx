"use client";

import { useTranslations } from "next-intl";
import { useModal } from "@/hooks/useModal";
import ComponentCard from "@/components/admin/common/ComponentCard";
import Switch from "@/components/admin/form/switch/Switch";
import type { ActivityCategory } from "@/types/admin/activityCategory";
import ActivityCategoryConfirmDialog from "./ActivityCategoryConfirmDialog";

const cardClass =
  "rounded-xl shadow-theme-xs [&>div:first-child>h3]:text-xl [&>div:first-child>h3]:font-semibold";

export default function ActivityCategorySettings({
  category,
  busy,
  canManageSystem,
}: {
  category: ActivityCategory | null;
  busy: boolean;
  canManageSystem: boolean;
}) {
  const t = useTranslations("activityCategories");
  const { isOpen, openModal, closeModal } = useModal();
  const active = category?.is_active ?? false;
  const allowed =
    !!category && (!category.is_system || canManageSystem) && !busy;
  return (
    <aside className="min-w-0 space-y-5">
      <ComponentCard title={t("form.publication")} className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {t("form.activeLabel")}
          </span>
          <div
            role="switch"
            aria-label={t("form.activeLabel")}
            aria-checked={active}
            aria-disabled={!allowed}
            aria-describedby="activity-category-status-help"
            tabIndex={allowed ? 0 : -1}
            onKeyDown={(event) => {
              if (allowed && [" ", "Enter"].includes(event.key)) {
                event.preventDefault();
                openModal();
              }
            }}
            className="focus-visible:outline-brand-500 rounded-lg p-1 focus-visible:outline-2"
          >
            <Switch
              key={`${active}-${isOpen}`}
              defaultChecked={active}
              disabled={!allowed}
              onChange={() => {
                if (allowed) openModal();
              }}
              label={t(active ? "active" : "inactive")}
            />
          </div>
        </div>
        <p
          id="activity-category-status-help"
          className="text-sm leading-6 text-gray-500 dark:text-gray-400"
        >
          {t(category ? "form.statusHelp" : "form.createInactive")}
        </p>
      </ComponentCard>
      <ComponentCard title={t("form.guidelines")} className={cardClass}>
        <ul className="marker:text-brand-500 list-disc space-y-3 ps-5 text-sm leading-6 text-gray-700 dark:text-gray-300">
          <li>{t("form.guideSlug")}</li>
          <li>{t("form.guideIcon")}</li>
          <li>{t("form.guideLanguages")}</li>
          <li>{t("form.guideSystem")}</li>
          <li>{t("form.guideHistory")}</li>
        </ul>
      </ComponentCard>
      {isOpen && category && (
        <ActivityCategoryConfirmDialog
          category={category}
          name={category.name ?? category.slug}
          operation={active ? "deactivate" : "activate"}
          onClose={closeModal}
        />
      )}
    </aside>
  );
}
