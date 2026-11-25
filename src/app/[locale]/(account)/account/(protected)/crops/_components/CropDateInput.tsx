"use client";
import type { ComponentProps } from "react";
import Input from "@/components/admin/form/input/InputField";
import { CalenderIcon } from "@/icons";

type CropDateInputProps = Omit<ComponentProps<typeof Input>, "type">;

/**
 * Native date input with a visible calendar icon.
 * The global admin stylesheet hides the browser's calendar indicator for all
 * date inputs, so the field opens the browser date picker when clicked.
 * Typing a date with the keyboard keeps working.
 */
export default function CropDateInput({
  onClick,
  className = "",
  ...props
}: CropDateInputProps) {
  return (
    <div className="relative">
      <Input
        {...props}
        type="date"
        className={`cursor-pointer !pe-10 ${className}`}
        onClick={(event) => {
          onClick?.(event);
          const input = event.currentTarget;
          if (input.disabled || input.readOnly) return;
          try {
            input.showPicker();
          } catch {
            // Unsupported browser or picker already open: typing still works.
          }
        }}
      />
      <CalenderIcon
        aria-hidden
        className="pointer-events-none absolute end-3 top-1/2 size-5 -translate-y-1/2 text-gray-500 dark:text-gray-400"
      />
    </div>
  );
}
