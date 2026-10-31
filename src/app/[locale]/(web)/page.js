import { setRequestLocale, getTranslations } from "next-intl/server";
import Image from "next/image";

export default async function Home({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tUi = await getTranslations("home");

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col items-center justify-between bg-white px-16 py-32 sm:items-start dark:bg-black">
        <Image
          className="h-5 w-[100px] dark:invert"
          src="/next.svg"
          alt={tUi("nextJsLogo")}
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl leading-10 font-semibold tracking-tight text-black dark:text-zinc-50">
            {tUi.rich("intro", {
              file: (chunks) => (
                <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-white/[.08]">
                  {chunks}
                </code>
              ),
            })}
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            {tUi.rich("guidance", {
              templates: (chunks) => (
                <a
                  href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
                  className="font-medium text-zinc-950 dark:text-zinc-50"
                >
                  {chunks}
                </a>
              ),
              learning: (chunks) => (
                <a
                  href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
                  className="font-medium text-zinc-950 dark:text-zinc-50"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] md:w-[158px] dark:hover:bg-[#ccc]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="h-[14px] w-4 dark:invert"
              src="/vercel.svg"
              alt={tUi("vercelLogomark")}
              width={16}
              height={14}
            />
            {tUi("deployNow")}
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] md:w-[158px] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            {tUi("documentation")}
          </a>
        </div>
      </main>
    </div>
  );
}
