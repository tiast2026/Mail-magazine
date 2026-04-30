"use client";

import Link from "next/link";
import type { MailOutput } from "@/lib/types";
import { useOptimisticOutputs } from "@/lib/optimistic";

export default function ResultsClient({
  initial,
}: {
  initial: MailOutput[];
}) {
  const outputs = useOptimisticOutputs(initial);

  const withResults = outputs.filter((o) => o.results?.rakuten);
  const withoutResults = outputs.filter((o) => !o.results?.rakuten);

  const totals = aggregateTotals(withResults);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">配信実績</h1>
        <p className="text-sm text-stone-500 mt-1">
          楽天 R-Mail から取り込んだ配信実績を一覧で確認できます。Tampermonkey で取り込んでください。
        </p>
      </header>

      {withResults.length === 0 ? (
        <div className="border border-dashed border-stone-300 rounded bg-white px-6 py-10 text-center">
          <p className="text-sm text-stone-600">
            まだ実績が取り込まれていません。
          </p>
          <p className="text-xs text-stone-500 mt-2">
            RMS にログインして、左下のピル「📨 全件取り込み開始」をクリックしてください。
          </p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="取り込み済み" value={`${withResults.length}`} unit="件" />
            <Stat
              label="合計送信数"
              value={totals.sentCount.toLocaleString()}
              unit="通"
            />
            <Stat
              label="平均開封率"
              value={totals.avgOpenRate.toFixed(1)}
              unit="%"
            />
            <Stat
              label="合計売上"
              value={`¥${totals.revenue.toLocaleString()}`}
              unit=""
            />
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">配信別実績</h2>
            <div className="overflow-x-auto border border-stone-200 rounded bg-white">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs text-stone-600">
                  <tr>
                    <Th>配信日</Th>
                    <Th>件名</Th>
                    <Th right>送信数</Th>
                    <Th right>開封率</Th>
                    <Th right>クリック</Th>
                    <Th right>送客</Th>
                    <Th right>転換</Th>
                    <Th right>売上</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {withResults.map((o) => (
                    <ResultRow key={o.id} output={o} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {withoutResults.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-stone-600 mb-2">
            未取り込み ({withoutResults.length}件)
          </h2>
          <ul className="space-y-1 text-xs">
            {withoutResults.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/outputs/${o.id}/`}
                  className="text-stone-500 hover:text-stone-800 hover:underline"
                >
                  {(o.scheduledAt ?? o.createdAt).slice(0, 10)} ・ {o.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ResultRow({ output }: { output: MailOutput }) {
  const r = output.results!;
  const rk = r.rakuten!;
  const dateStr = (output.sentAt ?? output.scheduledAt ?? output.createdAt).slice(
    0,
    10,
  );
  return (
    <>
      <tr className="border-t border-stone-200 hover:bg-stone-50">
        <Td>{dateStr}</Td>
        <Td>
          <Link
            href={`/outputs/${output.id}/`}
            className="font-medium hover:underline"
          >
            {output.title}
          </Link>
          {rk.mailId && (
            <span className="ml-2 text-[10px] text-stone-400">
              ID: {rk.mailId}
            </span>
          )}
          {r.rating != null && (
            <span className="ml-2 text-amber-500" title={`評価: ${r.rating}/5`}>
              {"★".repeat(r.rating)}
            </span>
          )}
        </Td>
        <Td right>{fmt(r.sentCount)}</Td>
        <Td right>{fmtPct(r.openRate)}</Td>
        <Td right>{fmt(r.clickCount)}</Td>
        <Td right>{fmt(rk.conversionVisitCount)}</Td>
        <Td right>{fmt(r.salesCount)}</Td>
        <Td right>
          {r.salesAmount != null ? `¥${fmt(r.salesAmount)}` : "—"}
        </Td>
        <Td>
          <Link
            href={`/outputs/${output.id}/`}
            className="text-xs text-stone-500 hover:text-stone-800"
          >
            詳細 →
          </Link>
        </Td>
      </tr>
      {r.notes && (
        <tr className="bg-amber-50/40 border-t border-amber-100">
          <td></td>
          <td colSpan={8} className="py-2 px-3 text-xs text-stone-700">
            <span className="text-amber-600 font-semibold mr-2">振り返り:</span>
            <span className="whitespace-pre-wrap">{r.notes}</span>
          </td>
        </tr>
      )}
    </>
  );
}

function Th({
  children,
  right,
}: {
  children?: React.ReactNode;
  right?: boolean;
}) {
  return (
    <th
      className={`py-2 px-3 font-medium ${right ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}
function Td({
  children,
  right,
}: {
  children?: React.ReactNode;
  right?: boolean;
}) {
  return (
    <td className={`py-2 px-3 ${right ? "text-right" : ""}`}>{children}</td>
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
    <div className="border border-stone-200 rounded bg-white p-4">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-1">
        <span className="text-xl font-semibold">{value}</span>
        {unit && <span className="text-xs text-stone-500 ml-1">{unit}</span>}
      </div>
    </div>
  );
}

function fmt(n: number | undefined | null): string {
  if (n == null) return "—";
  return n.toLocaleString("ja-JP");
}
function fmtPct(n: number | undefined | null): string {
  if (n == null) return "—";
  return `${n.toFixed(1)}%`;
}

function aggregateTotals(outputs: MailOutput[]): {
  sentCount: number;
  avgOpenRate: number;
  revenue: number;
} {
  let sent = 0;
  let openRateSum = 0;
  let openRateCount = 0;
  let revenue = 0;
  for (const o of outputs) {
    const r = o.results;
    if (!r) continue;
    if (typeof r.sentCount === "number") sent += r.sentCount;
    if (typeof r.openRate === "number") {
      openRateSum += r.openRate;
      openRateCount += 1;
    }
    if (typeof r.salesAmount === "number") revenue += r.salesAmount;
  }
  return {
    sentCount: sent,
    avgOpenRate: openRateCount ? openRateSum / openRateCount : 0,
    revenue,
  };
}
