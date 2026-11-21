"use client";

import { Fragment, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * Cache Components keeps visited pages alive in React <Activity>, so a
 * preserved Add form would show the previous visit's draft. Keying on
 * bfcacheId remounts it on every fresh push/replace navigation (fresh URL
 * defaults such as crop_id and crop_variety_id) while browser Back/Forward
 * still restores the draft.
 */
export default function StageTimelineCreateReset({
  children,
}: {
  children: ReactNode;
}) {
  const { bfcacheId } = useRouter();
  return <Fragment key={bfcacheId}>{children}</Fragment>;
}
