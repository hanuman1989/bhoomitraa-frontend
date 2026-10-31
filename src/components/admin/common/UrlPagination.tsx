"use client";

import { useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import Pagination from "@/components/admin/tables/Pagination";

interface UrlPaginationProps {
  currentPage: number;
  totalPages: number;
}

export default function UrlPagination({
  currentPage,
  totalPages,
}: UrlPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function onPageChange(page: number) {
    if (
      isPending ||
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > totalPages ||
      page === currentPage
    ) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  return (
    <div aria-busy={isPending}>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}
