import AdminToaster from "@/components/admin/common/AdminToaster";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { setRequestLocale, getTranslations } from "next-intl/server";

export default async function AdminAuthLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tUi = await getTranslations("auth.layout");
  return (
    <main className="relative flex min-h-screen flex-col bg-white p-6 lg:flex-row lg:p-0 dark:bg-gray-900">
      {children}
      <aside
        className="bg-brand-950 hidden min-h-screen w-1/2 items-center justify-center p-12 lg:flex dark:bg-gray-950"
        style={{
          backgroundImage: "url('/images/smart-ag-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="max-w-sm text-center">
          <Link href="/" aria-label={tUi("backToWebsite")}>
            <Image
              src="/images/logo/bhoomitraa-logo.png"
              alt="Bhoomitraa"
              width={231}
              height={48}
            />
          </Link>
        </div>
      </aside>
      <AdminToaster />
    </main>
  );
}
