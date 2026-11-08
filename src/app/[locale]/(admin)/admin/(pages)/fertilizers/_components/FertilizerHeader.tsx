import { useTranslations } from "next-intl";
import PageBreadcrumb from "@/components/admin/common/PageBreadCrumb";

export default function FertilizerHeader({
  mode = "list",
}: {
  mode?: "list" | "create" | "edit" | "view";
}) {
  const t = useTranslations("fertilizers");
  const title = t(mode === "list" ? "title" : `wizard.${mode}Title`);
  return (
    <PageBreadcrumb
      pageTitle={title}
      description={t(
        mode === "list" ? "description" : `wizard.${mode}Description`,
      )}
      breadcrumbs={[
        { label: t("home"), href: "/admin/dashboard" },
        { label: t("manager") },
        ...(mode === "list"
          ? []
          : [{ label: t("title"), href: "/admin/fertilizers" }]),
        { label: mode === "list" ? t("listTitle") : title },
      ]}
    />
  );
}
