import { Link } from "@/i18n/navigation";
import type { ComponentProps } from "react";

export interface BreadcrumbItem {
  label: string;
  href?: ComponentProps<typeof Link>["href"];
}

interface BreadcrumbProps {
  pageTitle: string;
  description?: string;
  breadcrumbs?: readonly BreadcrumbItem[];
}

export default function PageBreadcrumb({
  pageTitle,
  description,
  breadcrumbs = [{ label: pageTitle }],
}: BreadcrumbProps) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4 pb-1">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#0b164d] md:text-4xl dark:text-white/90">
          {pageTitle}
        </h1>
        {description && (
          <p className="mt-2 text-base text-[#53699b] dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      {breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="pt-2 text-sm">
          <ol className="flex flex-wrap items-center gap-3">
            {breadcrumbs.map((item, index) => {
              const isCurrentPage = index === breadcrumbs.length - 1;

              return (
                <li key={`${item.label}-${index}`} className="flex items-center gap-3">
                  {index > 0 && (
                    <svg
                      aria-hidden="true"
                      className="size-4 text-[#53699b] rtl:rotate-180"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="m6 4 4 4-4 4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  {item.href !== undefined && !isCurrentPage ? (
                    <Link
                      href={item.href}
                      className="text-[#53699b] hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={isCurrentPage ? "page" : undefined}
                      className={isCurrentPage
                        ? "font-medium text-[#0b164d] dark:text-white/90"
                        : "text-[#53699b] dark:text-gray-400"}
                    >
                      {item.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
    </header>
  );
}
