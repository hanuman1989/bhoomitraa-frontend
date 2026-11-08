import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
export default function NotFound() {
  const t = useTranslations("cropYieldBenchmarks");
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
        {t("notFound")}
      </h1>
      <Link
        href="/admin/crop-yield-benchmarks"
        className="text-brand-500 mt-4 inline-block"
      >
        {t("back")}
      </Link>
    </div>
  );
}
