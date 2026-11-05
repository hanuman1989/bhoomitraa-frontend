import { setRequestLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";

interface AdminPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  redirect({ href: "/admin/dashboard", locale });
}
