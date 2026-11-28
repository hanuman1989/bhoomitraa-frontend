import type { ReactNode, Ref } from "react";
import Tooltip from "@/components/common/Tooltip";
import { CloseLineIcon } from "@/icons";
import { cn } from "@/utils";
import FabButton from "./FabButton";
import type { FabGroup as FabGroupConfig } from "./fabGroups";

const enter =
  "transition-[opacity,translate,rotate] duration-200 ease-out starting:opacity-0 motion-reduce:transition-none";

/**
 * One speed dial: its items open directly above the main button, whose icon
 * becomes ✕. A blocked group explains why in a tooltip and stays shut.
 */
export default function FabGroup({
  group,
  label,
  reason,
  open,
  menuId,
  reasonId,
  buttonRef,
  onToggle,
  children,
}: {
  group: FabGroupConfig;
  label: string;
  /** Why the group can't open now; null when it can. */
  reason: string | null;
  open: boolean;
  menuId: string;
  reasonId: string;
  buttonRef?: Ref<HTMLButtonElement>;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <div
        id={menuId}
        role="group"
        aria-label={label}
        hidden={!open}
        className={cn(
          "flex shrink-0 flex-col items-end gap-2 starting:translate-y-2",
          enter,
        )}
      >
        {children}
      </div>
      <Tooltip
        content={reason}
        id={reason ? reasonId : undefined}
        side="start"
        className="shrink-0"
      >
        <FabButton
          ref={buttonRef}
          main
          color={group.color}
          icon={open ? CloseLineIcon : group.icon}
          iconClassName={open ? cn("starting:-rotate-90", enter) : undefined}
          label={
            <>
              {label}
              {group.badge && (
                <span className="bg-success-50 text-success-800 dark:bg-success-950 dark:text-success-300 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums">
                  {group.badge}
                </span>
              )}
            </>
          }
          aria-expanded={open}
          aria-controls={menuId}
          aria-disabled={reason ? true : undefined}
          aria-describedby={reason ? reasonId : undefined}
          onClick={() => {
            if (!reason) onToggle();
          }}
        />
      </Tooltip>
    </>
  );
}
