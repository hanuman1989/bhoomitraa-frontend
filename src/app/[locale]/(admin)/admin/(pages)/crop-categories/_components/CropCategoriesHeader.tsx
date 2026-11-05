import { useTranslations } from "next-intl";
import PageBreadcrumb from "@/components/admin/common/PageBreadCrumb";
import { Link } from "@/i18n/navigation";
import { CropCategoryIcon, PlusIcon } from "@/icons";

export default function CropCategoriesHeader({
  mode = "list",
}: {
  mode?: "list" | "create" | "edit";
}) {
  const t = useTranslations("cropCategories");
  const title = mode === "list" ? t("title") : t(`form.${mode}Title`);
  return (
    <div className="relative mb-6">
      <div
        className={`relative [&>header]:mb-0 [&>header]:flex-col-reverse [&>header]:gap-5 [&>header>div]:ps-20 [&>header>nav]:pt-0 ${mode === "list" ? "lg:[&>header>div]:pe-64" : ""}`}
      >
        <PageBreadcrumb
          pageTitle={title}
          description={
            mode === "list" ? t("description") : t(`form.${mode}Description`)
          }
          breadcrumbs={[
            { label: t("dashboard"), href: "/admin/dashboard" },
            ...(mode === "list"
              ? [{ label: title }]
              : [
                  { label: t("title"), href: "/admin/crop-categories" },
                  { label: title },
                ]),
          ]}
        />
        <span className="bg-brand-100 text-brand-600 dark:bg-brand-950 dark:text-brand-300 absolute start-0 bottom-1 flex size-16 items-center justify-center rounded-2xl">
          <CropCategoryIcon aria-hidden="true" className="size-9" />
        </span>
      </div>
      {mode === "list" && (
        <Link
          href="/admin/crop-categories/create"
          className="bg-brand-600 hover:bg-brand-700 focus-visible:outline-brand-500 mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white focus-visible:outline-2 lg:absolute lg:end-0 lg:bottom-1 lg:mt-0"
        >
          <PlusIcon aria-hidden="true" className="size-5" />
          {t("add")}
        </Link>
      )}
    </div>
  );
}
