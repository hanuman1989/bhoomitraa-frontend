"use client";
import {
  useState,
  type ComponentType,
  type InputHTMLAttributes,
  type SVGProps,
} from "react";
import { useTranslations } from "next-intl";
import Input from "@/components/admin/form/input/InputField";
import Label from "@/components/admin/form/Label";
import { EyeIcon, EyeCloseIcon } from "@/icons";

interface AccountInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "step"
> {
  id: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  error?: string;
  help?: string;
}
export default function AccountInput({
  id,
  label,
  icon: Icon,
  error,
  help,
  type,
  required,
  disabled,
  ...inputProps
}: AccountInputProps) {
  const t = useTranslations("account.fields");
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  return (
    <div>
      <Label
        htmlFor={id}
        className="font-semibold text-gray-900 dark:text-gray-100"
      >
        {label}
      </Label>
      <div className="relative">
        <Icon
          aria-hidden="true"
          className="pointer-events-none absolute start-3 top-3 z-1 size-5 text-gray-500 dark:text-gray-300"
        />
        <Input
          {...inputProps}
          id={id}
          type={isPassword && visible ? "text" : type}
          disabled={disabled}
          required={required}
          className="focus:border-success-500 focus:ring-success-500/20 bg-white/60 ps-11 pe-11 text-base dark:bg-gray-800/70"
          error={Boolean(error)}
          aria-required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={
            [error && `${id}-error`, help && `${id}-help`]
              .filter(Boolean)
              .join(" ") || undefined
          }
        />
        {isPassword && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? t("hidePassword") : t("showPassword")}
            aria-pressed={visible}
            className="focus-visible:outline-success-600 absolute end-2 top-1.5 rounded-md p-1.5 text-gray-600 focus-visible:outline-2 disabled:opacity-50 dark:text-gray-300"
          >
            {visible ? (
              <EyeIcon aria-hidden="true" className="size-5" />
            ) : (
              <EyeCloseIcon aria-hidden="true" className="size-5" />
            )}
          </button>
        )}
      </div>
      {help && (
        <p
          id={`${id}-help`}
          className="mt-1.5 text-xs text-gray-600 dark:text-gray-300"
        >
          {help}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-error-600 dark:text-error-400 mt-1.5 text-xs"
        >
          {error}
        </p>
      )}
    </div>
  );
}
