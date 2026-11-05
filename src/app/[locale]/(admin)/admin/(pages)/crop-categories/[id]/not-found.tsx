import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import ComponentCard from "@/components/admin/common/ComponentCard";

export default function CategoryNotFound() {
  const t = useTranslations("cropCategories");
  return (
    <ComponentCard title={t("notFound")}>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t("notFoundHelp")}
      </p>
      <Link
        href="/admin/crop-categories"
        className="text-brand-600 dark:text-brand-300 underline"
      >
        {t("back")}
      </Link>
    </ComponentCard>
  );
}
