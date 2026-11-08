import { useTranslations } from "next-intl";
import PageBreadcrumb from "@/components/admin/common/PageBreadCrumb";

export default function ActivityCategoriesHeader({
  mode = "list",
}: {
  mode?: "list" | "create" | "edit";
}) {
  const t = useTranslations("activityCategories");
  const title = mode === "list" ? t("title") : t(`form.${mode}Title`);
  return (
    <div className="mb-6">
      <PageBreadcrumb
        pageTitle={title}
        description={
          mode === "list" ? t("description") : t(`form.${mode}Description`)
        }
        breadcrumbs={[
          { label: t("home"), href: "/admin/dashboard" },
          { label: t("farmManager") },
          ...(mode === "list"
            ? []
            : [{ label: t("title"), href: "/admin/activity-categories" }]),
          { label: title },
        ]}
      />
    </div>
  );
}
