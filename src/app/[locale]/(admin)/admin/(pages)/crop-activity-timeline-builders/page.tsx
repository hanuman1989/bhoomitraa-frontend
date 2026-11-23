import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import PageBreadcrumb from "@/components/admin/common/PageBreadCrumb";
import SuspenseFallback from "@/components/admin/common/SuspenseFallback";
import { requireAdmin } from "@/lib/auth/dal";
import { handleActionError } from "@/lib/api/handleActionError";
import { getTimelineRegions } from "@/lib/apis/admin/cropStageTimelines";
import type { TimelineState } from "@/types/admin/cropStageTimeline";
import TimelineBuilderClient from "./_components/TimelineBuilderClient";

export const instant = false;

async function TimelineBuilderLoader() {
  const t = await getTranslations("timelineBuilder");
  let states: TimelineState[] = [];
  let failure = "";
  try {
    await requireAdmin();
    // Districts load once; crop workspaces load on demand from the client.
    states = await getTimelineRegions();
  } catch (error: unknown) {
    failure = (await handleActionError(error, t("feedback.loadFailed")))
      .message;
  }
  if (failure)
    return (
      <p
        role="alert"
        className="border-error-200 bg-error-50 text-error-700 dark:border-error-800 dark:bg-error-950 dark:text-error-300 rounded-xl border p-5 text-sm"
      >
        {failure}
      </p>
    );
  return <TimelineBuilderClient states={states} />;
}

export default async function CropActivityTimelineBuilderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("timelineBuilder");
  return (
    <>
      <div className="mb-6">
        <PageBreadcrumb
          pageTitle={t("title")}
          description={t("description")}
          breadcrumbs={[
            { label: t("home"), href: "/admin/dashboard" },
            { label: t("farmManager") },
            { label: t("title") },
          ]}
        />
      </div>
      <Suspense
        fallback={<SuspenseFallback variant="page" title={t("loading")} />}
      >
        <TimelineBuilderLoader />
      </Suspense>
    </>
  );
}
