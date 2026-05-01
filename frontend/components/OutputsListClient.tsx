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
          className="p-4 flex items-stretch gap-4"
        >
          <DateTile output={o} />
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
          <div className="shrink-0 text-right text-xs self-start">
            {o.results?.openRate != null ? (
              <div className="space-y-0.5 text-stone-700">
                {o.results.sentCount != null && (
                  <div>
                    <span className="text-stone-500">配信</span>{" "}
                    {o.results.sentCount.toLocaleString()}通
                  </div>
                )}
                <div>
                  <span className="text-stone-500">開封</span>{" "}
                  {o.results.openRate.toFixed(1)}%
                </div>
                {o.results.rakuten?.transactionRate != null && (
                  <div>
                    <span className="text-stone-500">転換</span>{" "}
                    {o.results.rakuten.transactionRate.toFixed(1)}%
                  </div>
                )}
                {o.results.salesAmount != null && (
                  <div
                    className="font-semibold mt-1"
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

function DateTile({ output: o }: { output: MailOutput }) {
  // 表示優先: 実配信時刻 > 配信予定 > 作成日
  const iso =
    o.results?.rakuten?.sentStartAt ?? o.sentAt ?? o.scheduledAt ?? o.createdAt;
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  const time = d.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // ステータス判定
  let status: { label: string; color: string };
  if (o.results?.rakuten?.sentStartAt || o.sentAt) {
    status = { label: "配信済", color: "text-emerald-700" };
  } else if (o.scheduledAt && new Date(o.scheduledAt).getTime() > Date.now()) {
    status = { label: "予定", color: "text-amber-700" };
  } else {
    status = { label: "下書き", color: "text-stone-500" };
  }

  return (
    <div className="shrink-0 w-16 text-center border-r border-stone-200 pr-3 flex flex-col justify-center">
      <div className="text-[10px] text-stone-500">{month}月</div>
      <div className="text-2xl font-semibold leading-none mt-0.5">{day}</div>
      <div className="text-[10px] text-stone-500 mt-0.5">({weekday})</div>
      <div className="text-[10px] text-stone-600 mt-1">{time}</div>
      <div className={`text-[10px] mt-0.5 font-medium ${status.color}`}>
        {status.label}
      </div>
    </div>
  );
}
