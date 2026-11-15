import { setRequestLocale, getTranslations } from "next-intl/server";
import { unstable_rethrow } from "next/navigation";
import { accountFarmsAPI } from "@/lib/apis/account/farms";
import FarmManager from "./_components/FarmManager";
import { farmFilters } from "./_components/farmFilters";
import type { PageSearchParams } from "@/types/api";
import { signedFarmSatelliteSources } from "@/components/common/maps/farmStaticMap.server";
export const instant = false;
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<PageSearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("farmerFarms");
  const query = (await searchParams) ?? {};
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  let initialData = null;
  try {
    const response = await accountFarmsAPI.list({
      ...farmFilters(
        first(query.search),
        first(query.status),
        first(query.page),
      ),
      include_boundary: 1,
    });
    if (response.status) initialData = response;
  } catch (error) {
    unstable_rethrow(error);
  }
  return (
    <FarmManager
      initialData={initialData}
      initialError={initialData ? "" : t("loadFailed")}
      initialSatellitePreviews={
        initialData ? signedFarmSatelliteSources(initialData.data) : undefined
      }
    />
  );
}
