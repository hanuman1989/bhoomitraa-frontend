import PageBreadcrumb, {
  type BreadcrumbItem,
} from "@/components/admin/common/PageBreadCrumb";

export default function KnowledgeSourcesHeader({
  title,
  description,
  breadcrumbs,
}: {
  title: string;
  description: string;
  breadcrumbs: BreadcrumbItem[];
}) {
  return (
    <div className="[&>header]:flex-col-reverse [&>header]:gap-4 [&>header>nav]:pt-0">
      <PageBreadcrumb
        pageTitle={title}
        description={description}
        breadcrumbs={breadcrumbs}
      />
    </div>
  );
}
