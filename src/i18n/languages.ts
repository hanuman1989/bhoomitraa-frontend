import { UsFlagIcon, InFlagIcon } from "@/icons";

import type { Locale } from "./routing";

export interface Language {
  id: string;
  name: string;
  shortName: string;
  dir: "ltr" | "rtl";
  FlagIcon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  badge?: string;
}

export const languages: Language[] = [
  {
    id: "en",
    name: "English",
    shortName: "English",
    dir: "ltr",
    FlagIcon: UsFlagIcon,
  },
  {
    id: "hi",
    name: "Hindi",
    shortName: "Hi",
    dir: "ltr",
    FlagIcon: InFlagIcon,
  },
];

export function getLanguage(locale: string): Language {
  return languages.find((l) => l.id === locale) || languages[0];
}

export function isRtl(locale: Locale): boolean {
  return getLanguage(locale).dir === "rtl";
}
