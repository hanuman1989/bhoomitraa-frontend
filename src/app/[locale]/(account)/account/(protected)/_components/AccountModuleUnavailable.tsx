import { useTranslations } from "next-intl";
import { SproutIcon } from "@/icons";
import { accountModules } from "../_config/accountModules";
import type { DashboardModule } from "./dashboardTypes";

export default function AccountModuleUnavailable({
  module,
}: {
  module: DashboardModule;
}) {
  const t = useTranslations("farmerDashboard");
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-center">
      <SproutIcon aria-hidden="true" className="text-success-600 size-10" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {t("comingSoonTitle")}
      </h3>
      <p className="max-w-lg text-gray-500 dark:text-gray-300">
        {t("comingSoon", { module: t(accountModules[module].titleKey) })}
      </p>
    </div>
  );
}
