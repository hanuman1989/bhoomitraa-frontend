import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

export const instant = false;
export default async function EditSeedPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  redirect({ href: `/admin/seeds/${id}/step/1`, locale });
}
