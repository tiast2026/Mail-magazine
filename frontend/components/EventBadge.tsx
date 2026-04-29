import type { CampaignEvent } from "@/lib/types";
import { getEventColor, getEventLabel } from "@/lib/events";

export default function EventBadge({
  event,
  size = "sm",
}: {
  event?: CampaignEvent;
  size?: "sm" | "md";
}) {
  const label = getEventLabel(event?.type);
  const color = getEventColor(event?.type);
  const padding = size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[10px]";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full text-white font-medium ${padding}`}
      style={{ backgroundColor: color }}
      title={event?.name ?? label}
    >
      {label}
    </span>
  );
}
