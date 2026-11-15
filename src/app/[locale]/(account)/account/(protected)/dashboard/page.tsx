import { getTranslations, setRequestLocale } from "next-intl/server";
import DashboardSummary from "./_components/DashboardSummary";
import DashboardCropTimeline from "./_components/DashboardCropTimeline";

export const instant = false;
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("farmerDashboard");
  return (
    <div className="space-y-3">
      <h2 className="text-2xl leading-7 font-bold text-gray-950 dark:text-white">
        {t("modules.dashboard")}
      </h2>
      <DashboardSummary />
      <DashboardCropTimeline />
    </div>
  );
}
