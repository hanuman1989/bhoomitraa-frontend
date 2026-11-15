import { useTranslations } from "next-intl";

export default function AccountModuleLoading() {
  const t = useTranslations("farmerDashboard");
  return (
    <p role="status" className="p-4 text-sm text-gray-500 dark:text-gray-300">
      {t("loading")}
    </p>
  );
}
