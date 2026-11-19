export const seasonIconValues = ["sprout", "sun", "leaf"] as const;

export type SeasonIcon = (typeof seasonIconValues)[number];

export interface SeasonPresentation {
  start_month: number | null;
  end_month: number | null;
  icon: SeasonIcon | null;
}

export function isSeasonIcon(value: unknown): value is SeasonIcon {
  return (
    typeof value === "string" && seasonIconValues.includes(value as SeasonIcon)
  );
}
