import { Suspense, type ReactNode } from "react";
import Image from "next/image";
import AccountLanguageSwitcher from "./AccountLanguageSwitcher";
import { useTranslations } from "next-intl";
import { SproutIcon } from "@/icons";

export default function AccountAuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const t = useTranslations("account");
  return (
    <main className="relative isolate flex min-h-svh items-center justify-center px-4 pt-24 pb-10 sm:px-6 sm:pt-24 sm:pb-12">
      <Image
        src="/images/smart-farming-landscape.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-1 object-cover object-center"
      />
      <Suspense fallback={null}>
        <AccountLanguageSwitcher />
      </Suspense>
      <section className="shadow-theme-lg w-full max-w-xl rounded-3xl border-2 border-white/80 bg-white/90 px-6 py-8 text-gray-900 backdrop-blur-xl sm:px-10 dark:border-gray-700 dark:bg-gray-900/95 dark:text-white">
        <header className="mb-7 text-center">
          <SproutIcon
            aria-hidden="true"
            className="text-success-600 mx-auto size-16 sm:size-20"
          />
          <p className="text-title-lg text-success-800 sm:text-title-xl dark:text-success-400 font-bold tracking-tight">
            {t("brand")}
          </p>
          <div className="mt-1 flex items-center justify-center gap-4">
            <span aria-hidden="true" className="bg-success-700 h-px w-12" />
            <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
            <span aria-hidden="true" className="bg-success-700 h-px w-12" />
          </div>
          {subtitle && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {subtitle}
            </p>
          )}
        </header>
        {children}
      </section>
    </main>
  );
}
