import { seasonIconValues, type SeasonIcon } from "@/types/season";

export const monthValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export const seasonIconOptions: ReadonlyArray<{ value: SeasonIcon }> =
  seasonIconValues.map((value) => ({ value }));

export function isValidMonth(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 12;
}

export function getMonthName(
  month: number | null | undefined,
  locale: string,
  format: "long" | "short" = "long",
) {
  if (!isValidMonth(month)) return null;
  return new Intl.DateTimeFormat(locale, { month: format, timeZone: "UTC" })
    .format(new Date(Date.UTC(2026, month - 1, 1)))
    .replace(/\.$/, "");
}

export function getMonthOptions(locale: string) {
  return monthValues.map((value) => ({
    value: String(value),
    label: getMonthName(value, locale) ?? String(value),
  }));
}

export function formatSeasonPeriod(
  startMonth: number | null | undefined,
  endMonth: number | null | undefined,
  locale: string,
) {
  const start = getMonthName(startMonth, locale, "short");
  const end = getMonthName(endMonth, locale, "short");
  return start && end ? `${start} – ${end}` : null;
}
