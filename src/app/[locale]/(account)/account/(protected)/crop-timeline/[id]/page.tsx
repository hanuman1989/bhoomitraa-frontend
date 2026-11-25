import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { accountCropTimelineAPI } from "@/lib/apis/account/farm-crop-timeline";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import type { PageSearchParams } from "@/types/api";
import type { CropTimelineData } from "@/types/account/cropTimeline";
import { CropNotice } from "../../crops/_components/CropUi";
import CropTimeline from "../_components/CropTimeline";
import CropTimelineSkeleton from "../_components/CropTimelineSkeleton";

type CropTimelinePageProps = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<PageSearchParams>;
};

export const instant = false;

export async function generateMetadata({
  params,
}: CropTimelinePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "farmerCropTimeline" });
  return { title: t("title") };
}

/** /account/crop-timeline/{id}: the same timeline as the dialog, full width. */
export default async function Page({
  params,
  searchParams,
}: CropTimelinePageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return (
    <Suspense fallback={<CropTimelineSkeleton />}>
      <CropTimelineContent id={id} searchParams={searchParams} />
    </Suspense>
  );
}

async function CropTimelineContent({
  id,
  searchParams,
}: {
  id: string;
  searchParams: Promise<PageSearchParams>;
}) {
  // Only positive whole-number ids reach the API.
  const cycleId = /^\d{1,15}$/.test(id) ? Number(id) : 0;
  if (cycleId < 1) notFound();
  const { activity } = await searchParams;
  const focusActivityId =
    typeof activity === "string" && /^\d{1,15}$/.test(activity)
      ? Number(activity)
      : undefined;
  const t = await getTranslations("farmerCropTimeline");
  let timeline: CropTimelineData | null = null;
  let loadError = "";
  try {
    const response = await accountCropTimelineAPI.get(cycleId);
    if (response.status) timeline = response.data;
    else loadError = t("loadFailed");
  } catch (error) {
    // Another farmer's crop, or a crop that does not exist, is simply not found.
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 403)
    )
      notFound();
    loadError = (await handleActionError(error, t("loadFailed"))).message;
  }
  if (!timeline) return <CropNotice error>{loadError}</CropNotice>;
  return (
    <CropTimeline
      timeline={timeline}
      variant="page"
      focusActivityId={focusActivityId}
    />
  );
}
