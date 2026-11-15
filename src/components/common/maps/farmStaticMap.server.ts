import "server-only";
import { createHmac } from "node:crypto";
import type { Farm } from "@/types/account/farm";
import { farmMapColor } from "./farmMapStyle";
import {
  farmStaticMapUrl,
  STATIC_MAP_URL_LIMIT,
  type FarmSatelliteSources,
} from "./farmStaticMap";

/** Called only with saved, account-scoped API results. No public signing endpoint. */
export function signedFarmSatelliteSources(
  farms: readonly Farm[],
): FarmSatelliteSources | undefined {
  const secret = process.env.GOOGLE_MAPS_STATIC_SIGNING_SECRET?.trim();
  if (!secret) return undefined;
  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_STATIC_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const validSecret =
    /^[\w-]+={0,2}$/.test(secret) &&
    secret.replace(/=+$/, "").length % 4 !== 1 &&
    Buffer.from(secret, "base64url").length > 0;
  const sign = (farm: Farm, selected: boolean): string | null => {
    if (!validSecret) return null;
    const url = farmStaticMapUrl(
      { ...farm, strokeColor: farmMapColor(farm.id, selected) },
      apiKey,
    );
    if (!url) return null;
    const resource = new URL(url);
    const signature = createHmac("sha1", Buffer.from(secret, "base64url"))
      .update(resource.pathname + resource.search)
      .digest("base64url");
    const signed = `${url}&signature=${signature}`;
    return signed.length <= STATIC_MAP_URL_LIMIT ? signed : null;
  };
  return Object.fromEntries(
    farms.map((farm) => [
      farm.id,
      { normal: sign(farm, false), selected: sign(farm, true) },
    ]),
  );
}
