import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/userAuth/dal";
import Providers from "@/providers/Providers";
import AccountAuthCard from "@/components/common/AccountAuthCard";
import LoginForm from "./_components/LoginForm";

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
    <AccountAuthCard title={t("login.title")}>
      <Suspense fallback={<p role="status">{t("loading")}</p>}>
        <LoginContent locale={locale} />
      </Suspense>
    </AccountAuthCard>
  );
}
async function LoginContent({ locale }: { locale: string }) {
  if (await getCurrentUser()) redirect({ href: "/account/dashboard", locale });
  return (
    <Providers>
      <LoginForm />
    </Providers>
  );
}
