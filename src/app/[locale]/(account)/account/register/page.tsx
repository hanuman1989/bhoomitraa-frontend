import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/userAuth/dal";
import AccountAuthCard from "@/components/common/AccountAuthCard";
import RegisterForm from "./_components/RegisterForm";

export const instant = false;
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");
  return (
    <AccountAuthCard
      title={t("register.title")}
      subtitle={t("register.subtitle")}
    >
      <Suspense fallback={<p role="status">{t("loading")}</p>}>
        <RegisterContent locale={locale} />
      </Suspense>
    </AccountAuthCard>
  );
}
async function RegisterContent({ locale }: { locale: string }) {
  if (await getCurrentUser()) redirect({ href: "/account/dashboard", locale });
  return <RegisterForm />;
}
