import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { accountIrrigationAPI } from "@/lib/apis/account/irrigation";
import { handleActionError } from "@/lib/api/handleActionError";
import type { PageSearchParams } from "@/types/api";
import IrrigationManager from "./_components/IrrigationManager";
import IrrigationManagerLoading from "./_components/IrrigationManagerLoading";
import {
  irrigationFilters,
  irrigationQuery,
} from "./_components/irrigationFilters";

type IrrigationPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<PageSearchParams>;
};

export default function Page(props: IrrigationPageProps) {
  return (
    <Suspense fallback={<IrrigationManagerLoading />}>
      <IrrigationManagerContent {...props} />
    </Suspense>
  );
}

async function IrrigationManagerContent({
  params,
  searchParams,
}: IrrigationPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("farmerIrrigation");
  const query = irrigationQuery(irrigationFilters(await searchParams));
  // The first list page, the unfiltered summary and the options load together;
  // one failing doesn't hide the others.
  const [list, summary, options] = await Promise.allSettled([
    accountIrrigationAPI.list(query),
    accountIrrigationAPI.summary(),
    accountIrrigationAPI.options(),
  ]);
  let initialError: string | undefined;
  for (const result of [list, summary, options])
    if (result.status === "rejected")
      initialError ??= (
        await handleActionError(result.reason, t("errors.loadFailed"))
      ).message;
    else if (!result.value.status) initialError ??= t("errors.loadFailed");
  const loaded = <R extends { status: boolean }>(
    result: PromiseSettledResult<R>,
  ) =>
    result.status === "fulfilled" && result.value.status ? result.value : null;
  return (
    <IrrigationManager
      initialList={loaded(list)}
      initialSummary={loaded(summary)?.data ?? null}
      initialOptions={loaded(options)?.data ?? null}
      initialError={initialError}
    />
  );
}
