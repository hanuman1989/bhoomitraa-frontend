import { useTranslations } from "next-intl";
export default function PageLoader({ message }) {
  const tUi = useTranslations("ui.pageLoader");
  if (message === undefined) message = tUi("loading");

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-900"
    >
      <div className="text-center">
        <div
          aria-hidden="true"
          className="border-primary/20 border-t-primary mx-auto size-16 rounded-full border-4 motion-safe:animate-spin"
        ></div>
        <p className="text-primary mt-4 font-medium">{message}</p>
      </div>
    </div>
  );
}
