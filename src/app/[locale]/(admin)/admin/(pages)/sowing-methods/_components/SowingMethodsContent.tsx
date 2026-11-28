import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";
import { sowingMethodsAPI } from "@/lib/apis/admin/sowingMethods";
import type {
  SowingMethodOptions,
  SowingMethodsResponse,
} from "@/types/admin/sowingMethod";
import type { PageProps } from "@/types/api";
import SowingMethodsList from "./SowingMethodsList";

export default async function SowingMethodsContent({
  searchParams,
}: PageProps) {
  const t = await getTranslations("sowingMethods");
  const { page: rawPage } = await searchParams;
  const page =
    typeof rawPage === "string" && /^\d+$/.test(rawPage) ? Number(rawPage) : 0;
  let result: SowingMethodsResponse;
  let options: SowingMethodOptions;
  try {
    await requireAdmin();
    const [response, optionResponse] = await Promise.all([
      sowingMethodsAPI.list({
        page: Number.isSafeInteger(page) && page > 0 ? page : 1,
        per_page: 10,
      }),
      sowingMethodsAPI.options(),
    ]);
    if (!response.status || !optionResponse.status) {
      throw new ApiError(t("loadFailed"), 502);
    }
    result = response;
    options = optionResponse.data;
  } catch (error) {
    const failure = await handleActionError(error, t("loadFailed"));
    return (
      <p
        role="alert"
        className="bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-300 rounded-xl p-4 text-sm"
      >
        {failure.message}
      </p>
    );
  }

  const { current_page, last_page } = result.pagination;
  if (current_page > last_page) {
    redirect({
      href: {
        pathname: "/admin/sowing-methods",
        query: last_page > 1 ? { page: last_page } : {},
      },
      locale: await getLocale(),
    });
  }

  return <SowingMethodsList result={result} options={options} />;
}
