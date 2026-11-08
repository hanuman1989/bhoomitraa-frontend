import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

export const instant = false;
export default async function EditFertilizerPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  redirect({ href: `/admin/fertilizers/${id}/step/1`, locale });
}
