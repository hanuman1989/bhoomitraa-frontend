"use client";

import { useTranslations } from "next-intl";
import Button from "@/components/admin/ui/button/Button";
import { PlusIcon, SproutIcon } from "@/icons";

/** First-run state shown until a valid Timeline Configuration is saved. */
export default function TimelineEmptyState({
  onStart,
}: {
  onStart: () => void;
}) {
  const t = useTranslations("timelineBuilder.emptyState");
  return (
    <section
      aria-labelledby="timeline-empty-title"
      className="rounded-2xl border border-gray-200 bg-white px-6 py-14 text-center dark:border-gray-800 dark:bg-white/3"
    >
      <div className="bg-brand-50 text-brand-500 ring-brand-100 dark:bg-brand-950 dark:ring-brand-900 mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl ring-1">
        <SproutIcon aria-hidden="true" className="size-8" />
      </div>
      <h2
        id="timeline-empty-title"
        className="text-title-sm font-semibold text-gray-800 dark:text-white/90"
      >
        {t("title")}
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500 dark:text-gray-400">
        {t("description")}
      </p>
      <Button
        onClick={onStart}
        className="mt-6"
        startIcon={<PlusIcon aria-hidden="true" className="size-5" />}
      >
        {t("action")}
      </Button>
    </section>
  );
}
