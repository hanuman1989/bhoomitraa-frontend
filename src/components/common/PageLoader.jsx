export default function PageLoader({ message = "Loading..." }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-900"
    >
      <div className="text-center">
        <div
          aria-hidden="true"
          className="mx-auto size-16 rounded-full border-4 border-primary/20 border-t-primary motion-safe:animate-spin"
        ></div>
        <p className="mt-4 font-medium text-primary">{message}</p>
      </div>
    </div>
  );
}
