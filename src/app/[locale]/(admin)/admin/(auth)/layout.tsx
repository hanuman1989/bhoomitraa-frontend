import AdminToaster from "@/components/admin/common/AdminToaster";
import { Link } from "@/i18n/navigation";
import Image from "next/image";

export default async function AdminAuthLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
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
          <Link href="/" aria-label="Back To Website">
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
