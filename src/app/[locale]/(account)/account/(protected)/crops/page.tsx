import { getTranslations, setRequestLocale } from "next-intl/server";
import AccountModuleUnavailable from "../_components/AccountModuleUnavailable";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("farmerDashboard");
  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold text-gray-950 dark:text-white">
        {t("modules.crop-manager")}
      </h2>
      <AccountModuleUnavailable module="crop-manager" />
    </div>
  );
}
