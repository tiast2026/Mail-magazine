"use client";

import Link from "next/link";
import type { MailOutput } from "@/lib/types";
import { useOptimisticOutputs } from "@/lib/optimistic";
import EventBadge from "./EventBadge";

export default function OutputsListClient({
  initial,
}: {
  initial: MailOutput[];
}) {
  const outputs = useOptimisticOutputs(initial);

  if (outputs.length === 0) {
    return (
      <div className="border border-dashed border-stone-300 rounded p-10 text-center text-stone-500 text-sm bg-white">
        まだ配信メルマガはありません。
        <br />
        Claude Code に「品番ABCでセール告知メルマガ作って」と指示してください。
      </div>
    );
  }

  return (
    <ul className="card divide-y divide-stone-100">
      {outputs.map((o) => (
        <li
          key={o.id}
          className="p-4 flex items-center justify-between gap-4"
        >
          <div className="min-w-0 flex-1">
            <Link
              href={`/outputs/${o.id}/`}
              className="font-medium hover:underline block truncate"
            >
              {o.title}
            </Link>
            <div className="text-xs text-stone-500 mt-1 flex items-center gap-2 flex-wrap">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px]"
                style={{ backgroundColor: "var(--brand-primary)" }}
              >
                テンプレ {o.templateId}
              </span>
              {o.event && <EventBadge event={o.event} />}
              <span>商品 {o.products.length} 点</span>
              <span>
                {new Date(o.scheduledAt ?? o.createdAt).toLocaleString("ja-JP", {
                  year: "numeric",
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {o.scheduledAt && o.sentAt
                  ? " 配信済"
                  : o.scheduledAt
                    ? " 予定"
                    : ""}
              </span>
            </div>
            {o.event?.name && (
              <div className="text-xs text-stone-500 mt-1">{o.event.name}</div>
            )}
            {o.tags && o.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {o.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-stone-100 text-stone-700 rounded-full px-2 py-0.5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="shrink-0 text-right text-xs">
            {o.results?.openRate != null ? (
              <div className="space-y-0.5 text-stone-700">
                <div>開封 {o.results.openRate.toFixed(1)}%</div>
                {o.results.clickRate != null && (
                  <div>クリック {o.results.clickRate.toFixed(1)}%</div>
                )}
                {o.results.salesAmount != null && (
                  <div
                    className="font-medium"
                    style={{ color: "var(--brand-accent)" }}
                  >
                    ￥{o.results.salesAmount.toLocaleString()}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-stone-400">実績未入力</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
