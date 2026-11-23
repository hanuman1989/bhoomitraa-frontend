import { ChevronDownIcon } from "@/icons";
import { cn } from "@/utils";

// Same size and tokens as the shared admin Select/Input controls (h-9).
const selectClasses =
  "shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 h-9 w-full appearance-none rounded-lg border border-gray-300 bg-white py-1.5 ps-4 pe-10 text-sm text-gray-800 transition outline-none focus:ring-3 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

export default function FilterSelect({
  id,
  label,
  className = "",
  children,
  ...selectProps
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
      >
        {label}
      </label>
      <div className="relative">
        <select
          {...selectProps}
          id={id}
          className={cn(selectClasses, className)}
        >
          {children}
        </select>
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-gray-500 dark:text-gray-400"
        />
      </div>
    </div>
  );
}
