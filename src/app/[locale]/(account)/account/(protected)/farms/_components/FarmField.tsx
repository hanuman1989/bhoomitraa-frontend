import type { ReactNode } from "react";
import Label from "@/components/admin/form/Label";
export default function FarmField({
  id,
  label,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <Label
        htmlFor={id}
        className="font-semibold text-gray-950 dark:text-gray-100"
      >
        {label}
        {required && (
          <span aria-hidden="true" className="text-error-600 ms-1">
            *
          </span>
        )}
      </Label>
      {children}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-error-600 dark:text-error-400 mt-1 text-xs"
        >
          {error}
        </p>
      )}
    </div>
  );
}
