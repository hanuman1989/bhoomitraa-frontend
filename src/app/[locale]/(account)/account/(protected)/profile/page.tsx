import { setRequestLocale } from "next-intl/server";
import ProfileDetails from "./_components/ProfileDetails";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProfileDetails />;
}
