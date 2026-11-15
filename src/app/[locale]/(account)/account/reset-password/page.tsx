import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { PageProps } from "@/types/api";
import AccountAuthCard from "@/components/common/AccountAuthCard";
import ResetPasswordForm from "./_components/ResetPasswordForm";

export const instant = false;
export default async function Page({
  params,
  searchParams,
}: PageProps & { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");
  return (
    <AccountAuthCard title={t("reset.title")} subtitle={t("reset.subtitle")}>
      <Suspense fallback={<p role="status">{t("loading")}</p>}>
        <ResetContent searchParams={searchParams} />
      </Suspense>
    </AccountAuthCard>
  );
}
async function ResetContent({ searchParams }: PageProps) {
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : "";
  const email = typeof query.email === "string" ? query.email : "";
  return <ResetPasswordForm token={token} email={email} />;
}
