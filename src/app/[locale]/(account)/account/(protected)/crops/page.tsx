import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { accountFarmCropsAPI } from "@/lib/apis/account/farm-crops";
import { handleActionError } from "@/lib/api/handleActionError";
import type { PageSearchParams } from "@/types/api";
import type { CropCycle, CropSummary } from "@/types/account/farmCrop";
import type { PaginatedResponse } from "@/types/api";
import CropManager from "./_components/CropManager";
import CropManagerLoading from "./_components/CropManagerLoading";
import { cropFilters } from "./_components/cropFilters";

type CropPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<PageSearchParams>;
};

export default function Page(props: CropPageProps) {
  return (
    <Suspense fallback={<CropManagerLoading />}>
      <CropManagerContent {...props} />
    </Suspense>
  );
}

async function CropManagerContent({ params, searchParams }: CropPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("farmerCrops");
  const filters = cropFilters(await searchParams);
  const { status, page, per_page, ...summaryFilters } = filters;
  let initialData: PaginatedResponse<CropCycle> | null = null;
  let initialSummary: CropSummary | null = null;
  let initialError: string | undefined;
  try {
    const [list, summary] = await Promise.all([
      accountFarmCropsAPI.list(filters),
      accountFarmCropsAPI.summary(summaryFilters),
    ]);
    initialData = list.status ? list : null;
    initialSummary = summary.status ? summary.data : null;
    if (!list.status || !summary.status) initialError = t("loadFailed");
  } catch (error) {
    const failure = await handleActionError(error, t("loadFailed"));
    initialError = failure.message;
  }
  return (
    <CropManager
      initialData={initialData}
      initialSummary={initialSummary}
      initialError={initialError}
    />
  );
}
