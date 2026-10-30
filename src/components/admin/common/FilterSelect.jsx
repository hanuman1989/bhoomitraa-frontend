import { ChevronDownIcon } from "@/icons";

const selectClasses =
  "h-12 w-full appearance-none rounded-md border border-[#dce3f1] bg-white px-4 pe-10 text-sm text-[#53699b] outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300";

export default function FilterSelect({
  id,
  label,
  className = "",
  children,
  ...selectProps
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <select
          {...selectProps}
          id={id}
          className={`${selectClasses} ${className}`}
        >
          {children}
        </select>
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none absolute end-4 top-4 size-4 text-[#53699b]"
        />
      </div>
    </div>
  );
}
