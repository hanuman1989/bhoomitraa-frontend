import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("stageTimelines");
  return (
    <div className="rounded-xl border border-gray-200 p-8 text-center dark:border-gray-800">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
        {t("notFound")}
      </h1>
      <Link
        href="/admin/crop-stage-timelines"
        className="text-brand-600 dark:text-brand-400 mt-4 inline-block hover:underline"
      >
        {t("back")}
      </Link>
    </div>
  );
}
