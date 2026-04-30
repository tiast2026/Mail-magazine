"use client";

import Link from "next/link";
import { useOptimisticOutputs } from "@/lib/optimistic";
import EventBadge from "@/components/EventBadge";
import EventCalendar from "@/components/EventCalendar";
import type { MailOutput } from "@/lib/types";

export default function DashboardOutputs({
  outputs: initial,
  templatesCount,
}: {
  outputs: MailOutput[];
  templatesCount: number;
}) {
  const outputs = useOptimisticOutputs(initial);

  const totalSales = outputs.reduce(
    (sum, o) => sum + (o.results?.salesAmount ?? 0),
    0,
  );
  const sendsWithRates = outputs.filter((o) => o.results?.openRate != null);
  const avgOpenRate =
    sendsWithRates.length > 0
      ? sendsWithRates.reduce(
          (sum, o) => sum + (o.results?.openRate ?? 0),
          0,
        ) / sendsWithRates.length
      : null;

  return (
    <>
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-stone-900">
            楽天イベント × 配信予定カレンダー
          </h2>
          <span className="text-xs text-stone-500">
            告知解禁日以降に配信可能
          </span>
        </div>
        <EventCalendar outputs={outputs} />
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="登録テンプレート" value={`${templatesCount}`} unit="件" />
        <Stat label="配信済みメルマガ" value={`${outputs.length}`} unit="件" />
        <Stat
          label="平均開封率"
          value={avgOpenRate != null ? avgOpenRate.toFixed(1) : "—"}
          unit={avgOpenRate != null ? "%" : ""}
        />
        <Stat
          label="累計売上"
          value={totalSales > 0 ? `${(totalSales / 10000).toFixed(1)}` : "—"}
          unit={totalSales > 0 ? "万円" : ""}
        />
      </section>

      <section>
        <SectionHeader title="最近の配信メルマガ" link="/outputs" />
        {outputs.length === 0 ? (
          <EmptyState
            text="まだ配信メルマガはありません"
            sub="Claude Code に「品番〇〇でメルマガ作って」と指示してください"
          />
        ) : (
          <ul className="card divide-y divide-stone-100">
            {outputs.slice(0, 5).map((o) => (
              <li key={o.id}>
                <Link
                  href={`/outputs/${o.id}/`}
                  className="block p-4 hover:bg-stone-50 transition"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-stone-900 truncate">
                        {o.title}
                      </div>
                      <div className="text-xs text-stone-500 mt-1 flex items-center gap-2 flex-wrap">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px]"
                          style={{ backgroundColor: "var(--brand-primary)" }}
                        >
                          テンプレ {o.templateId}
                        </span>
                        {o.event && <EventBadge event={o.event} />}
                        <span>
                          {new Date(
                            o.scheduledAt ?? o.createdAt,
                          ).toLocaleString("ja-JP", {
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                    {o.results?.openRate != null && (
                      <div className="text-xs text-right shrink-0">
                        <div className="text-stone-700 font-medium">
                          開封 {o.results.openRate.toFixed(1)}%
                        </div>
                        {o.results.salesAmount != null && (
                          <div
                            className="font-semibold mt-0.5"
                            style={{ color: "var(--brand-accent)" }}
                          >
                            ￥{o.results.salesAmount.toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="card p-4">
      <div className="text-[11px] text-stone-500 uppercase tracking-wide">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <div className="text-2xl font-semibold text-stone-900">{value}</div>
        <div className="text-xs text-stone-500">{unit}</div>
      </div>
    </div>
  );
}

function SectionHeader({ title, link }: { title: string; link: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-base font-semibold text-stone-900">{title}</h2>
      <Link href={link} className="text-xs text-stone-500 hover:text-stone-900">
        すべて見る →
      </Link>
    </div>
  );
}

function EmptyState({ text, sub }: { text: string; sub: string }) {
  return (
    <div className="card border-dashed p-10 text-center">
      <div className="text-stone-700 text-sm">{text}</div>
      <div className="text-xs text-stone-500 mt-2">{sub}</div>
    </div>
  );
}
