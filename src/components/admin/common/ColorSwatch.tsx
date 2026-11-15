import { useTranslations } from "next-intl";

// Validate before applying a value supplied by a form or API as a CSS color.
export function isHexColor(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length === 7 &&
    /^#[0-9A-Fa-f]{6}$/.test(value)
  );
}

export default function ColorSwatch({
  value,
}: {
  value: string | null | undefined;
}) {
  const t = useTranslations("ui.colorPicker");
  const color = isHexColor(value) ? value : null;
  return (
    <span className="inline-flex items-center gap-2 text-sm whitespace-nowrap text-gray-700 dark:text-gray-300">
      <span
        aria-hidden="true"
        className="size-6 shrink-0 rounded-md border border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800"
        style={color ? { backgroundColor: color } : undefined}
      />
      <span className={color ? "font-mono" : undefined}>
        {color ?? t("notAssigned")}
      </span>
    </span>
  );
}
