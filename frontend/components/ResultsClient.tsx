"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CampaignEventType, MailOutput } from "@/lib/types";
import { useOptimisticOutputs } from "@/lib/optimistic";
import { EVENT_LABELS, getEventLabel } from "@/lib/events";

type SortKey =
  | "date"
  | "title"
  | "sentCount"
  | "openRate"
  | "clickCount"
  | "sendCount"
  | "txCount"
  | "txRate"
  | "revenue"
  | "rating";

type SortDir = "asc" | "desc";

export default function ResultsClient({
  initial,
}: {
  initial: MailOutput[];
}) {
  const outputs = useOptimisticOutputs(initial);
  const withResults = outputs.filter((o) => o.results?.rakuten);
  const withoutResults = outputs.filter((o) => !o.results?.rakuten);

  // フィルター
  const [filterEvent, setFilterEvent] = useState<CampaignEventType | "">("");
  const [filterTemplate, setFilterTemplate] = useState<string>("");
  const [minRating, setMinRating] = useState<number>(0);
  const [searchText, setSearchText] = useState<string>("");

  // ソート
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const templates = useMemo(() => {
    return Array.from(new Set(withResults.map((o) => o.templateId))).sort();
  }, [withResults]);

  const filtered = useMemo(() => {
    return withResults.filter((o) => {
      if (filterEvent && (o.event?.type ?? "") !== filterEvent) return false;
      if (filterTemplate && o.templateId !== filterTemplate) return false;
      if (minRating > 0 && (o.results?.rating ?? 0) < minRating) return false;
      if (searchText && !o.title.toLowerCase().includes(searchText.toLowerCase()))
        return false;
      return true;
    });
  }, [withResults, filterEvent, filterTemplate, minRating, searchText]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      const cmp = compareVals(av, bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totals = aggregateTotals(filtered);
  const top3OpenRate = topN(filtered, "openRate", 3);
  const top3Sales = topN(filtered, "revenue", 3);
  const top3Conversion = topN(filtered, "txRate", 3);
  const byTemplate = aggregateBy(filtered, (o) => o.templateId);
  const byEvent = aggregateBy(filtered, (o) => o.event?.type ?? "(なし)");

  function changeSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function clearFilters() {
    setFilterEvent("");
    setFilterTemplate("");
    setMinRating(0);
    setSearchText("");
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">配信実績</h1>
        <p className="text-sm text-stone-500 mt-1">
          全配信メルマガの実績をフィルター・ソート・集計できます。
        </p>
      </header>

      {withResults.length === 0 ? (
        <EmptyImports />
      ) : (
        <>
          {/* 集計カード */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="取込済み" value={`${filtered.length}`} unit="件" sub={filtered.length !== withResults.length ? `(全${withResults.length})` : ""} />
            <Stat label="合計送信数" value={fmt(totals.sentCount)} unit="通" />
            <Stat label="平均開封率" value={totals.avgOpenRate.toFixed(1)} unit="%" />
            <Stat label="合計売上" value={`¥${fmt(totals.revenue)}`} unit="" />
          </section>

          {/* TOP3 セクション */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <TopBox title="🏆 開封率 TOP3" items={top3OpenRate} unit="%" valueKey="openRate" />
            <TopBox title="💰 売上 TOP3" items={top3Sales} unit="円" valueKey="revenue" prefix="¥" />
            <TopBox title="🎯 転換率 TOP3" items={top3Conversion} unit="%" valueKey="txRate" />
          </section>

          {/* テンプレ別 / イベント別集計 */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AggBox title="テンプレ別" rows={byTemplate} />
            <AggBox title="イベント別" rows={byEvent} labelMap={(k) => getEventLabel(k as CampaignEventType) || k} />
          </section>

          {/* フィルター */}
          <section className="bg-stone-50 border border-stone-200 rounded p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">フィルター</h2>
              <button
                onClick={clearFilters}
                className="text-xs text-stone-500 hover:text-stone-800 underline"
              >
                クリア
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <FilterField label="件名検索">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="例: マラソン"
                  className="w-full text-xs border border-stone-300 rounded px-2 py-1"
                />
              </FilterField>
              <FilterField label="イベント">
                <select
                  value={filterEvent}
                  onChange={(e) => setFilterEvent(e.target.value as CampaignEventType | "")}
                  className="w-full text-xs border border-stone-300 rounded px-2 py-1"
                >
                  <option value="">全部</option>
                  {Object.entries(EVENT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="テンプレ">
                <select
                  value={filterTemplate}
                  onChange={(e) => setFilterTemplate(e.target.value)}
                  className="w-full text-xs border border-stone-300 rounded px-2 py-1"
                >
                  <option value="">全部</option>
                  {templates.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="評価 (最低★)">
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="w-full text-xs border border-stone-300 rounded px-2 py-1"
                >
                  <option value="0">すべて</option>
                  <option value="3">★3 以上</option>
                  <option value="4">★4 以上</option>
                  <option value="5">★5 のみ</option>
                </select>
              </FilterField>
            </div>
          </section>

          {/* メイン表 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">配信別実績 ({sorted.length}件)</h2>
            <div className="overflow-x-auto border border-stone-200 rounded bg-white">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-xs text-stone-600">
                  <tr>
                    <SortTh sortKey="date" current={sortKey} dir={sortDir} onClick={changeSort}>配信日</SortTh>
                    <SortTh sortKey="title" current={sortKey} dir={sortDir} onClick={changeSort}>件名</SortTh>
                    <SortTh sortKey="sentCount" current={sortKey} dir={sortDir} onClick={changeSort} right>送信数</SortTh>
                    <SortTh sortKey="openRate" current={sortKey} dir={sortDir} onClick={changeSort} right>開封率</SortTh>
                    <SortTh sortKey="clickCount" current={sortKey} dir={sortDir} onClick={changeSort} right>クリック</SortTh>
                    <SortTh sortKey="sendCount" current={sortKey} dir={sortDir} onClick={changeSort} right>送客</SortTh>
                    <SortTh sortKey="txCount" current={sortKey} dir={sortDir} onClick={changeSort} right>転換</SortTh>
                    <SortTh sortKey="txRate" current={sortKey} dir={sortDir} onClick={changeSort} right>転換率</SortTh>
                    <SortTh sortKey="revenue" current={sortKey} dir={sortDir} onClick={changeSort} right>売上</SortTh>
                    <SortTh sortKey="rating" current={sortKey} dir={sortDir} onClick={changeSort} right>評価</SortTh>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((o) => (
                    <ResultRow key={o.id} output={o} />
                  ))}
                  {sorted.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center text-xs text-stone-500 py-6">
                        条件に一致するメルマガがありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {withoutResults.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-stone-600 mb-2">
            未取込 ({withoutResults.length}件)
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
  const dateStr = (output.sentAt ?? output.scheduledAt ?? output.createdAt).slice(0, 10);
  return (
    <tr className="border-t border-stone-200 hover:bg-stone-50">
      <Td>{dateStr}</Td>
      <Td>
        <Link href={`/outputs/${output.id}/`} className="font-medium hover:underline block max-w-md truncate">
          {output.title}
        </Link>
        <div className="text-[10px] text-stone-400 mt-0.5 flex gap-2">
          {rk.mailId && <span>ID: {rk.mailId}</span>}
          <span>テンプレ {output.templateId}</span>
          {output.event?.type && (
            <span>{getEventLabel(output.event.type)}</span>
          )}
        </div>
      </Td>
      <Td right>{fmt(r.sentCount)}</Td>
      <Td right>{fmtPct(r.openRate)}</Td>
      <Td right>{fmt(r.clickCount)}</Td>
      <Td right>{fmt(rk.conversionVisitCount)}</Td>
      <Td right>{fmt(r.salesCount)}</Td>
      <Td right>{fmtPct(rk.transactionRate)}</Td>
      <Td right>{r.salesAmount != null ? `¥${fmt(r.salesAmount)}` : "—"}</Td>
      <Td right>
        {r.rating != null ? (
          <span className="text-amber-500" title={`評価: ${r.rating}/5`}>
            {"★".repeat(r.rating)}
          </span>
        ) : "—"}
      </Td>
    </tr>
  );
}

function SortTh({
  children, sortKey, current, dir, onClick, right,
}: {
  children: React.ReactNode;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
  right?: boolean;
}) {
  const active = current === sortKey;
  const arrow = active ? (dir === "asc" ? " ▲" : " ▼") : "";
  return (
    <th
      onClick={() => onClick(sortKey)}
      className={`py-2 px-3 font-medium cursor-pointer hover:bg-stone-100 select-none ${right ? "text-right" : "text-left"} ${active ? "text-stone-900" : ""}`}
    >
      {children}{arrow}
    </th>
  );
}

function Td({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return <td className={`py-2 px-3 ${right ? "text-right" : ""}`}>{children}</td>;
}

function Stat({ label, value, unit, sub }: { label: string; value: string; unit: string; sub?: string }) {
  return (
    <div className="border border-stone-200 rounded bg-white p-4">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-1">
        <span className="text-xl font-semibold">{value}</span>
        {unit && <span className="text-xs text-stone-500 ml-1">{unit}</span>}
        {sub && <span className="text-[10px] text-stone-400 ml-1">{sub}</span>}
      </div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] text-stone-500 block mb-1">{label}</label>
      {children}
    </div>
  );
}

function TopBox({
  title, items, unit, valueKey, prefix,
}: {
  title: string;
  items: MailOutput[];
  unit: string;
  valueKey: SortKey;
  prefix?: string;
}) {
  return (
    <div className="border border-stone-200 rounded bg-white p-4">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      {items.length === 0 ? (
        <div className="text-xs text-stone-400 py-2">データなし</div>
      ) : (
        <ol className="space-y-1.5">
          {items.map((o, i) => {
            const v = getSortValue(o, valueKey);
            return (
              <li key={o.id} className="text-xs flex items-baseline gap-2">
                <span className="text-stone-400 w-4">{i + 1}.</span>
                <Link href={`/outputs/${o.id}/`} className="flex-1 truncate hover:underline">
                  {o.title}
                </Link>
                <span className="font-semibold text-stone-800">
                  {prefix}{typeof v === "number" ? (valueKey === "openRate" || valueKey === "txRate" ? v.toFixed(1) : fmt(v)) : "—"}{unit}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function AggBox({
  title, rows, labelMap,
}: {
  title: string;
  rows: Array<{ key: string; count: number; avgOpenRate: number; sumRevenue: number }>;
  labelMap?: (k: string) => string;
}) {
  return (
    <div className="border border-stone-200 rounded bg-white p-4">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      {rows.length === 0 ? (
        <div className="text-xs text-stone-400 py-2">データなし</div>
      ) : (
        <table className="w-full text-xs">
          <thead className="text-stone-500">
            <tr>
              <th className="text-left py-1">区分</th>
              <th className="text-right py-1">件数</th>
              <th className="text-right py-1">平均開封率</th>
              <th className="text-right py-1">合計売上</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-stone-100">
                <td className="py-1">{labelMap ? labelMap(r.key) : r.key}</td>
                <td className="py-1 text-right">{r.count}</td>
                <td className="py-1 text-right">{r.avgOpenRate.toFixed(1)}%</td>
                <td className="py-1 text-right">¥{fmt(r.sumRevenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function EmptyImports() {
  return (
    <div className="border border-dashed border-stone-300 rounded bg-white px-6 py-10 text-center">
      <p className="text-sm text-stone-600">まだ実績が取り込まれていません。</p>
      <p className="text-xs text-stone-500 mt-2">
        RMS にログインして、左下のピル「📨 メルマガ分析取得」をクリックしてください。
      </p>
    </div>
  );
}

// -----------------------------------------
// utils
// -----------------------------------------

function getSortValue(o: MailOutput, key: SortKey): number | string {
  const r = o.results;
  const rk = r?.rakuten;
  switch (key) {
    case "date": return o.sentAt ?? o.scheduledAt ?? o.createdAt;
    case "title": return o.title;
    case "sentCount": return r?.sentCount ?? 0;
    case "openRate": return r?.openRate ?? 0;
    case "clickCount": return r?.clickCount ?? 0;
    case "sendCount": return rk?.conversionVisitCount ?? 0;
    case "txCount": return r?.salesCount ?? 0;
    case "txRate": return rk?.transactionRate ?? 0;
    case "revenue": return r?.salesAmount ?? 0;
    case "rating": return r?.rating ?? 0;
  }
}

function compareVals(a: number | string, b: number | string): number {
  if (typeof a === "string" && typeof b === "string") return a.localeCompare(b);
  return (a as number) > (b as number) ? 1 : (a as number) < (b as number) ? -1 : 0;
}

function topN(outputs: MailOutput[], key: SortKey, n: number): MailOutput[] {
  return [...outputs]
    .filter((o) => {
      const v = getSortValue(o, key);
      return typeof v === "number" && v > 0;
    })
    .sort((a, b) => {
      const av = getSortValue(a, key) as number;
      const bv = getSortValue(b, key) as number;
      return bv - av;
    })
    .slice(0, n);
}

function aggregateBy(
  outputs: MailOutput[],
  fn: (o: MailOutput) => string,
): Array<{ key: string; count: number; avgOpenRate: number; sumRevenue: number }> {
  const map = new Map<string, { count: number; openRateSum: number; openRateCount: number; revenue: number }>();
  for (const o of outputs) {
    const k = fn(o);
    const cur = map.get(k) ?? { count: 0, openRateSum: 0, openRateCount: 0, revenue: 0 };
    cur.count++;
    if (typeof o.results?.openRate === "number") {
      cur.openRateSum += o.results.openRate;
      cur.openRateCount++;
    }
    if (typeof o.results?.salesAmount === "number") cur.revenue += o.results.salesAmount;
    map.set(k, cur);
  }
  return Array.from(map.entries())
    .map(([key, v]) => ({
      key,
      count: v.count,
      avgOpenRate: v.openRateCount ? v.openRateSum / v.openRateCount : 0,
      sumRevenue: v.revenue,
    }))
    .sort((a, b) => b.sumRevenue - a.sumRevenue);
}

function aggregateTotals(outputs: MailOutput[]): {
  sentCount: number;
  avgOpenRate: number;
  revenue: number;
} {
  let sent = 0, openRateSum = 0, openRateCount = 0, revenue = 0;
  for (const o of outputs) {
    if (typeof o.results?.sentCount === "number") sent += o.results.sentCount;
    if (typeof o.results?.openRate === "number") {
      openRateSum += o.results.openRate;
      openRateCount++;
    }
    if (typeof o.results?.salesAmount === "number") revenue += o.results.salesAmount;
  }
  return {
    sentCount: sent,
    avgOpenRate: openRateCount ? openRateSum / openRateCount : 0,
    revenue,
  };
}

function fmt(n: number | undefined | null): string {
  if (n == null) return "—";
  return n.toLocaleString("ja-JP");
}
function fmtPct(n: number | undefined | null): string {
  if (n == null) return "—";
  return `${n.toFixed(1)}%`;
}
