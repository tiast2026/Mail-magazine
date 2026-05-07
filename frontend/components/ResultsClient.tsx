"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CampaignEventType, MailOutput } from "@/lib/types";
import { useOptimisticOutputs } from "@/lib/optimistic";
import { EVENT_LABELS, getEventLabel } from "@/lib/events";

type SummaryRange = "all" | "7d" | "30d" | "90d" | "month";

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
  | "rating"
  | "revenuePerSent" // 売上/通
  | "ctr" // クリック数 / 開封数
  | "favoriteRate";

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
  const [filterMonth, setFilterMonth] = useState<string>(""); // "YYYY-MM" 形式 / "" は全月
  const [minRating, setMinRating] = useState<number>(0);
  const [searchText, setSearchText] = useState<string>("");

  // 月次サマリーの期間切替
  const [summaryRange, setSummaryRange] = useState<SummaryRange>("all");

  // ソート
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const templates = useMemo(() => {
    return Array.from(new Set(withResults.map((o) => o.templateId))).sort();
  }, [withResults]);

  const months = useMemo(() => {
    const set = new Set<string>();
    for (const o of withResults) {
      const ym = monthOf(o);
      if (ym) set.add(ym);
    }
    return Array.from(set).sort().reverse(); // 新しい月が上
  }, [withResults]);

  // 期間タブで指定された期間（全期間/直近N日/月別）を現在の filtered に反映する
  const summaryBucket = useMemo(
    () => getDateBucket(summaryRange, filterMonth),
    [summaryRange, filterMonth],
  );

  const filtered = useMemo(() => {
    const range = summaryBucket.range;
    return withResults.filter((o) => {
      if (filterEvent && (o.event?.type ?? "") !== filterEvent) return false;
      if (filterTemplate && o.templateId !== filterTemplate) return false;
      if (minRating > 0 && (o.results?.rating ?? 0) < minRating) return false;
      if (searchText && !o.title.toLowerCase().includes(searchText.toLowerCase()))
        return false;
      // summaryRange "month" は filterMonth を range に変換済みなので
      // ここで重複チェックしない。summaryRange "all" の場合は range が null
      if (range) {
        const t = sendTimeMs(o);
        if (t === null) return false;
        if (t < range.from || t >= range.to) return false;
      }
      return true;
    });
  }, [
    withResults,
    filterEvent,
    filterTemplate,
    minRating,
    searchText,
    summaryBucket,
  ]);

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

  const [showWorst, setShowWorst] = useState(false);
  const rank = (key: SortKey) =>
    showWorst ? bottomN(filtered, key, 3) : topN(filtered, key, 3);
  const top3OpenRate = rank("openRate");
  const top3Sales = rank("revenue");
  const top3Conversion = rank("txRate");
  const top3RevPerSent = rank("revenuePerSent");
  const top3CTR = rank("ctr");
  const top3Favorite = rank("favoriteRate");
  const byTemplate = aggregateBy(filtered, (o) => o.templateId);
  const byEvent = aggregateBy(filtered, (o) => o.event?.type ?? "(なし)");
  // 月別集計はフィルター適用前（withResults）で出して、月セレクトの前提値とする
  const byMonth = aggregateBy(withResults, (o) => monthOf(o) ?? "(不明)").sort(
    (a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0),
  );

  // タイミング分析
  const byDayOfWeek = aggregateByDimension(filtered, dimDayOfWeek);
  const byHour = aggregateByDimension(filtered, dimHour);
  const byDayCategory = aggregateByDimension(filtered, dimDayCategory);

  // ターゲット分析
  const bySegment = aggregateByDimension(filtered, dimSegment);
  const byDevice = aggregateDeviceTotals(filtered);
  const byTemplateEvent = aggregateByDimension(filtered, dimTemplateEvent)
    .filter((r) => r.count >= 1)
    .sort((a, b) => b.avgRevPerSent - a.avgRevPerSent)
    .slice(0, 5);

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
    setFilterMonth("");
    setMinRating(0);
    setSearchText("");
    setSummaryRange("all");
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
          {/* 月次サマリー（RMS 月次指標スタイル） */}
          <MonthlySummary
            withResults={withResults}
            range={summaryRange}
            filterMonth={filterMonth}
            availableMonths={months}
            onRangeChange={(r) => {
              setSummaryRange(r);
              // 「月別」を選んだとき、フィルター月が空なら最新月を自動選択
              if (r === "month" && !filterMonth && months[0]) {
                setFilterMonth(months[0]);
              }
            }}
            onFilterMonthChange={setFilterMonth}
            extraFilter={(o) => {
              if (filterEvent && (o.event?.type ?? "") !== filterEvent) return false;
              if (filterTemplate && o.templateId !== filterTemplate) return false;
              if (minRating > 0 && (o.results?.rating ?? 0) < minRating) return false;
              if (searchText && !o.title.toLowerCase().includes(searchText.toLowerCase())) return false;
              return true;
            }}
          />

          {/* ランキング セクション（6カテゴリ） */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                ランキング {showWorst ? "ワースト3" : "TOP3"}
              </h2>
              <button
                onClick={() => setShowWorst(!showWorst)}
                className="text-xs px-3 py-1.5 rounded border border-stone-300 hover:bg-stone-100"
              >
                {showWorst ? "🏆 TOP3 を表示" : "📉 ワースト3 を表示"}
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <TopBox
                title={`${showWorst ? "📉" : "🏆"} 開封率 ${showWorst ? "ワースト3" : "TOP3"}`}
                hint="開封数 ÷ 送信数（メールを受け取った人のうち何%が開いたか）"
                items={top3OpenRate}
                unit="%"
                valueKey="openRate"
                allItems={filtered}
                isWorst={showWorst}
              />
              <TopBox
                title={`${showWorst ? "📉" : "💰"} 売上 ${showWorst ? "ワースト3" : "TOP3"}`}
                hint="このメルマガ経由で発生した総売上"
                items={top3Sales}
                unit="円"
                valueKey="revenue"
                prefix="¥"
                allItems={filtered}
                isWorst={showWorst}
              />
              <TopBox
                title={`${showWorst ? "📉" : "🎯"} 転換率（CVR） ${showWorst ? "ワースト3" : "TOP3"}`}
                hint="転換数 ÷ 送客数（クリックして来訪した人のうち何%が購入したか）"
                items={top3Conversion}
                unit="%"
                valueKey="txRate"
                allItems={filtered}
                isWorst={showWorst}
              />
              <TopBox
                title={`${showWorst ? "📉" : "💎"} 売上/通 ${showWorst ? "ワースト3" : "TOP3"}`}
                hint="売上 ÷ 送信数（1通あたり何円の売上を生んだか）"
                items={top3RevPerSent}
                unit="円"
                valueKey="revenuePerSent"
                allItems={filtered}
                isWorst={showWorst}
              />
              <TopBox
                title={`${showWorst ? "📉" : "👆"} CTR（開封クリック率） ${showWorst ? "ワースト3" : "TOP3"}`}
                hint="クリック数 ÷ 開封数（メールを開いた人のうち何%が本文リンクをクリックしたか）"
                items={top3CTR}
                unit="%"
                valueKey="ctr"
                allItems={filtered}
                isWorst={showWorst}
              />
              <TopBox
                title={`${showWorst ? "📉" : "❤️"} お気に入り率 ${showWorst ? "ワースト3" : "TOP3"}`}
                hint="お気に入り登録数 ÷ 送客数（来訪者のうち何%がお気に入り登録したか）"
                items={top3Favorite}
                unit="%"
                valueKey="favoriteRate"
                allItems={filtered}
                isWorst={showWorst}
              />
            </div>
          </section>

          {/* 配信タイミング分析（いつ送ると反応が良いか） */}
          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">⏰ 配信タイミング分析</h2>
              <p className="text-xs text-stone-500 mt-1">
                過去配信から「いつ送ると反応が良いか」を集計。売上/通でソートし、最上位に
                <span className="mx-0.5 text-amber-700">推奨</span>
                バッジを付与（2件以上のデータがある場合）。
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <TimingBox
                title="曜日別"
                hint="JST 基準。土日 vs 平日の反応差を確認"
                rows={byDayOfWeek}
                emptyHint="—"
              />
              <TimingBox
                title="時間帯別"
                hint="JST 基準。配信時刻の反応差を確認"
                rows={byHour}
                emptyHint={
                  byHour.length <= 1
                    ? "現状ほぼ同一時間帯のみ。他時間帯の A/B テストで比較できます"
                    : "—"
                }
              />
              <TimingBox
                title="月内日パターン"
                hint="楽天キャンペーン日との重なり"
                rows={byDayCategory}
                emptyHint="—"
              />
            </div>
          </section>

          {/* 配信ターゲット分析（誰に送ると効くか） */}
          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">🎯 配信ターゲット分析</h2>
              <p className="text-xs text-stone-500 mt-1">
                「誰に配信すると効くか」を見るための切り口。セグメント・デバイス・コンテンツ相性。
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <TimingBox
                title="セグメント別"
                hint="RMS のリスト条件で集計"
                rows={bySegment}
                emptyHint={
                  bySegment.length <= 1 && bySegment[0]?.label.includes("全件")
                    ? "現在は全件配信のみ。年代・購買頻度・ブランドお気に入り等のセグメント配信を試すと、ここで反応差が見えるようになります"
                    : "—"
                }
              />
              <DeviceBox rows={byDevice} />
              <TimingBox
                title="テンプレ × イベント 相性 TOP5"
                hint="どのコンテンツ×訴求が当たるか。売上/通で順位付け"
                rows={byTemplateEvent}
                emptyHint="—"
                showCount
              />
            </div>
          </section>

          {/* 月別集計（クリックでフィルター適用） */}
          <section>
            <AggBox
              title="月別"
              rows={byMonth}
              labelMap={(k) => formatMonthLabel(k)}
              activeKey={
                summaryRange === "month" && filterMonth ? filterMonth : undefined
              }
              onRowClick={(k) => {
                // 同じ月をもう一度押すと「全期間」へ。違う月なら「月別」モードに切替
                if (summaryRange === "month" && filterMonth === k) {
                  setSummaryRange("all");
                  setFilterMonth("");
                } else {
                  setSummaryRange("month");
                  setFilterMonth(k);
                }
              }}
            />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              <FilterField label="件名検索">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="例: マラソン"
                  className="w-full text-xs border border-stone-300 rounded px-2 py-1"
                />
              </FilterField>
              <FilterField label="月">
                <select
                  value={summaryRange === "month" ? filterMonth : ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) {
                      setSummaryRange("month");
                      setFilterMonth(v);
                    } else {
                      setSummaryRange("all");
                      setFilterMonth("");
                    }
                  }}
                  className="w-full text-xs border border-stone-300 rounded px-2 py-1"
                >
                  <option value="">全期間</option>
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {formatMonthLabel(m)}
                    </option>
                  ))}
                </select>
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

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] text-stone-500 block mb-1">{label}</label>
      {children}
    </div>
  );
}

function TopBox({
  title, hint, items, unit, valueKey, prefix, allItems, isWorst,
}: {
  title: string;
  /** タイトル下に小さく表示する補足説明（計算式など） */
  hint?: string;
  items: MailOutput[];
  unit: string;
  valueKey: SortKey;
  prefix?: string;
  /** 平均値計算用の母集団。指定された場合「平均比」を表示 */
  allItems?: MailOutput[];
  /** ワースト表示モード（メダル無し、棒グラフ色を rose に） */
  isWorst?: boolean;
}) {
  // 平均値
  const avgValue =
    allItems && allItems.length > 0
      ? allItems
          .map((o) => Number(getSortValue(o, valueKey)) || 0)
          .filter((v) => v > 0)
          .reduce((sum, v, _, arr) => sum + v / arr.length, 0)
      : 0;

  const isPercent =
    valueKey === "openRate" ||
    valueKey === "txRate" ||
    valueKey === "ctr" ||
    valueKey === "favoriteRate";

  return (
    <div className="border border-stone-200 rounded bg-white p-4">
      <div className="flex items-baseline justify-between mb-1 gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {avgValue > 0 && (
          <div className="text-[10px] text-stone-500 shrink-0" title="全件平均">
            平均{" "}
            <span className="font-medium text-stone-700">
              {prefix}
              {isPercent ? avgValue.toFixed(1) : fmt(Math.round(avgValue))}
              {unit}
            </span>
          </div>
        )}
      </div>
      {hint && (
        <div className="text-[10px] text-stone-500 mb-2 leading-snug">
          {hint}
        </div>
      )}
      {items.length === 0 ? (
        <div className="text-xs text-stone-400 py-2">データなし</div>
      ) : (
        <ol className="space-y-3">
          {items.map((o, i) => {
            const v = Number(getSortValue(o, valueKey)) || 0;
            const diffFromAvg = avgValue > 0 ? v - avgValue : 0;
            const dateStr = (
              o.results?.rakuten?.sentStartAt ??
              o.sentAt ??
              o.scheduledAt ??
              o.createdAt
            ).slice(0, 10);
            return (
              <li key={o.id}>
                <div className="flex items-start gap-2">
                  <span
                    className={`shrink-0 w-7 text-center text-base ${
                      i === 0
                        ? "font-bold"
                        : i === 1
                          ? "font-semibold"
                          : ""
                    }`}
                    title={`${i + 1}位`}
                  >
                    {isWorst
                      ? `${i + 1}.`
                      : i === 0
                        ? "🥇"
                        : i === 1
                          ? "🥈"
                          : i === 2
                            ? "🥉"
                            : `${i + 1}.`}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/outputs/${o.id}/`}
                      className="text-xs leading-snug hover:underline block"
                      title={o.title}
                    >
                      {o.title}
                    </Link>
                    <div className="text-[10px] text-stone-400 mt-0.5">
                      {dateStr} ・ テンプレ {o.templateId}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-base font-bold text-stone-900 leading-none">
                      {prefix}
                      {isPercent ? v.toFixed(1) : fmt(v)}
                      <span className="text-xs text-stone-500 font-normal ml-0.5">
                        {unit}
                      </span>
                    </div>
                    {avgValue > 0 && Math.abs(diffFromAvg) > 0.01 && (
                      <div
                        className={`text-[10px] mt-0.5 ${diffFromAvg >= 0 ? "text-emerald-700" : "text-rose-700"}`}
                        title="平均比"
                      >
                        {diffFromAvg >= 0 ? "+" : ""}
                        {isPercent
                          ? diffFromAvg.toFixed(1) + "pt"
                          : prefix
                            ? prefix + fmt(Math.round(diffFromAvg))
                            : fmt(Math.round(diffFromAvg))}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function AggBox({
  title, rows, labelMap, activeKey, onRowClick,
}: {
  title: string;
  rows: Array<{ key: string; count: number; avgOpenRate: number; sumRevenue: number }>;
  labelMap?: (k: string) => string;
  activeKey?: string;
  onRowClick?: (key: string) => void;
}) {
  const clickable = !!onRowClick;
  return (
    <div className="border border-stone-200 rounded bg-white p-4">
      <h3 className="text-sm font-semibold mb-2">
        {title}
        {clickable && (
          <span className="text-[10px] text-stone-400 font-normal ml-2">
            クリックでフィルター
          </span>
        )}
      </h3>
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
            {rows.map((r) => {
              const isActive = activeKey === r.key;
              return (
                <tr
                  key={r.key}
                  onClick={clickable ? () => onRowClick!(r.key) : undefined}
                  className={`border-t border-stone-100 ${
                    clickable ? "cursor-pointer hover:bg-stone-50" : ""
                  } ${isActive ? "bg-amber-50" : ""}`}
                >
                  <td className="py-1">
                    {isActive && <span className="mr-1">●</span>}
                    {labelMap ? labelMap(r.key) : r.key}
                  </td>
                  <td className="py-1 text-right">{r.count}</td>
                  <td className="py-1 text-right">{r.avgOpenRate.toFixed(1)}%</td>
                  <td className="py-1 text-right">¥{fmt(r.sumRevenue)}</td>
                </tr>
              );
            })}
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
    case "revenuePerSent": return rk?.revenuePerSent ?? 0;
    case "ctr":
      return r?.openCount && r?.clickCount
        ? (r.clickCount / r.openCount) * 100
        : 0;
    case "favoriteRate": return rk?.favoriteRate ?? 0;
  }
}

function compareVals(a: number | string, b: number | string): number {
  if (typeof a === "string" && typeof b === "string") return a.localeCompare(b);
  return (a as number) > (b as number) ? 1 : (a as number) < (b as number) ? -1 : 0;
}

function bottomN(outputs: MailOutput[], key: SortKey, n: number): MailOutput[] {
  return [...outputs]
    .filter((o) => {
      const v = getSortValue(o, key);
      // 0 や未測定値は除外（実績が無いものをワーストにしても意味がない）
      return typeof v === "number" && v > 0;
    })
    .sort((a, b) => {
      const av = getSortValue(a, key) as number;
      const bv = getSortValue(b, key) as number;
      return av - bv; // 昇順 = 小さい順
    })
    .slice(0, n);
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

function fmt(n: number | undefined | null): string {
  if (n == null) return "—";
  return n.toLocaleString("ja-JP");
}
function fmtPct(n: number | undefined | null): string {
  if (n == null) return "—";
  return `${n.toFixed(1)}%`;
}

/** 配信日(優先順位: sentAt > scheduledAt > createdAt)を YYYY-MM 形式で返す */
function monthOf(o: MailOutput): string | null {
  const iso = o.sentAt ?? o.scheduledAt ?? o.createdAt;
  if (!iso) return null;
  // ISO8601 文字列の先頭7文字 = YYYY-MM
  const m = iso.match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : null;
}

/** "2026-05" → "2026年5月" */
function formatMonthLabel(ym: string): string {
  const m = ym.match(/^(\d{4})-(\d{2})$/);
  if (!m) return ym;
  return `${m[1]}年${parseInt(m[2], 10)}月`;
}

// -----------------------------------------
// タイミング・ターゲット分析
// -----------------------------------------

type TimingRow = {
  key: string;
  label: string;
  count: number;
  avgOpenRate: number;
  avgTxRate: number;
  avgRevPerSent: number;
};

const DOW_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

/** ISO 文字列を JST の Date として返す。後段は getUTCXxx で読む前提（実行環境の TZ に依存しない） */
function jstDate(o: MailOutput): Date | null {
  const iso = o.results?.rakuten?.sentStartAt ?? o.sentAt ?? o.scheduledAt;
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getTime() + 9 * 3600 * 1000);
}

function dimDayOfWeek(o: MailOutput): { key: string; label: string } | null {
  const d = jstDate(o);
  if (!d) return null;
  const dow = d.getUTCDay();
  const isWeekend = dow === 0 || dow === 6;
  return {
    key: String(dow),
    label: `${DOW_LABELS[dow]}曜${isWeekend ? "（週末）" : ""}`,
  };
}

function dimHour(o: MailOutput): { key: string; label: string } | null {
  const d = jstDate(o);
  if (!d) return null;
  const h = d.getUTCHours();
  return { key: String(h), label: `${String(h).padStart(2, "0")}:00 台` };
}

function dimDayCategory(o: MailOutput): { key: string; label: string } | null {
  const d = jstDate(o);
  if (!d) return null;
  const day = d.getUTCDate();
  if (day === 1) return { key: "wonderful", label: "ワンダフルデー (1日)" };
  if (day % 5 === 0) return { key: "points", label: "5・0のつく日" };
  if (day >= 28) return { key: "monthend", label: "月末 (28日以降)" };
  return { key: "other", label: "通常日" };
}

function dimSegment(o: MailOutput): { key: string; label: string } {
  const lc = o.results?.rakuten?.listCondition;
  if (!lc || /指定はありません|すべて/.test(lc)) {
    return { key: "all", label: "全件配信" };
  }
  // 長すぎるラベルは省略
  const trimmed = lc.replace(/▼閉じる▲/g, "").trim();
  return { key: trimmed, label: trimmed.length > 30 ? trimmed.slice(0, 30) + "…" : trimmed };
}

function dimTemplateEvent(o: MailOutput): { key: string; label: string } {
  const t = o.templateId || "(なし)";
  const e = o.event?.type ? getEventLabel(o.event.type) : "通常配信";
  return { key: `${t}|${e}`, label: `テンプレ ${t} × ${e}` };
}

function aggregateByDimension(
  outputs: MailOutput[],
  dimension: (o: MailOutput) => { key: string; label: string } | null,
): TimingRow[] {
  type Acc = {
    label: string;
    openSum: number;
    openN: number;
    txSum: number;
    txN: number;
    rpsSum: number;
    rpsN: number;
    count: number;
  };
  const map = new Map<string, Acc>();
  for (const o of outputs) {
    const dim = dimension(o);
    if (!dim) continue;
    const cur = map.get(dim.key) ?? {
      label: dim.label,
      openSum: 0,
      openN: 0,
      txSum: 0,
      txN: 0,
      rpsSum: 0,
      rpsN: 0,
      count: 0,
    };
    cur.count++;
    if (typeof o.results?.openRate === "number") {
      cur.openSum += o.results.openRate;
      cur.openN++;
    }
    const rk = o.results?.rakuten;
    if (typeof rk?.transactionRate === "number") {
      cur.txSum += rk.transactionRate;
      cur.txN++;
    }
    if (typeof rk?.revenuePerSent === "number") {
      cur.rpsSum += rk.revenuePerSent;
      cur.rpsN++;
    }
    map.set(dim.key, cur);
  }
  return Array.from(map.entries())
    .map(([key, v]) => ({
      key,
      label: v.label,
      count: v.count,
      avgOpenRate: v.openN ? v.openSum / v.openN : 0,
      avgTxRate: v.txN ? v.txSum / v.txN : 0,
      avgRevPerSent: v.rpsN ? v.rpsSum / v.rpsN : 0,
    }))
    .sort((a, b) => b.avgRevPerSent - a.avgRevPerSent);
}

type DeviceTotalRow = {
  device: string;
  label: string;
  opens: number;
  clicks: number;
  conversions: number;
  revenue: number;
};

const DEVICE_LABELS: Record<string, string> = {
  pc: "PC",
  smartphone: "スマートフォン",
  tablet: "タブレット",
  app: "楽天アプリ",
  total: "合計",
};

function aggregateDeviceTotals(outputs: MailOutput[]): DeviceTotalRow[] {
  const map = new Map<string, DeviceTotalRow>();
  for (const o of outputs) {
    const breakdown = o.results?.rakuten?.deviceBreakdown ?? [];
    for (const d of breakdown) {
      if (d.device === "total") continue; // 合算はスキップ
      const cur = map.get(d.device) ?? {
        device: d.device,
        label: DEVICE_LABELS[d.device] ?? d.device,
        opens: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
      };
      cur.opens += d.opens ?? 0;
      cur.clicks += d.clicks ?? 0;
      cur.conversions += d.conversions ?? 0;
      cur.revenue += d.revenue ?? 0;
      map.set(d.device, cur);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

function TimingBox({
  title,
  hint,
  rows,
  emptyHint,
  showCount,
}: {
  title: string;
  hint?: string;
  rows: TimingRow[];
  emptyHint?: string;
  /** 件数カラムを目立たせるか（テンプレ×イベントなど件数自体に意味がある場合） */
  showCount?: boolean;
}) {
  // 推奨判定：avgRevPerSent が最大かつ count >= 2、かつ比較対象が複数ある場合のみ
  const eligible = rows.filter((r) => r.count >= 2);
  const recommendedKey =
    rows.length >= 2 && eligible.length > 0
      ? eligible.reduce((best, r) => (r.avgRevPerSent > best.avgRevPerSent ? r : best))
          .key
      : null;
  const singleRow = rows.length === 1;
  // 開封率の最大値（バー長さの基準）
  const maxOpen = Math.max(...rows.map((r) => r.avgOpenRate), 0.01);

  return (
    <div className="border border-stone-200 rounded bg-white p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {hint && (
        <div className="text-[10px] text-stone-500 mt-0.5 leading-snug">
          {hint}
        </div>
      )}
      {rows.length === 0 ? (
        <div className="text-xs text-stone-400 py-3">
          {emptyHint && emptyHint !== "—" ? emptyHint : "データなし"}
        </div>
      ) : (
        <>
          <table className="w-full text-xs mt-3 table-fixed">
            <colgroup>
              <col />
              <col className="w-9" />
              <col className="w-12" />
              <col className="w-10" />
              <col className="w-14" />
            </colgroup>
            <thead className="text-stone-500">
              <tr className="border-b border-stone-200">
                <th className="text-left py-1.5 font-medium">区分</th>
                <th className="text-right py-1.5 font-medium whitespace-nowrap">件数</th>
                <th className="text-right py-1.5 font-medium whitespace-nowrap" title="平均開封率">
                  開封
                </th>
                <th className="text-right py-1.5 font-medium whitespace-nowrap" title="平均転換率">
                  転換
                </th>
                <th className="text-right py-1.5 font-medium whitespace-nowrap" title="平均 売上/通">
                  売上/通
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isRec = r.key === recommendedKey;
                const barW = (r.avgOpenRate / maxOpen) * 100;
                return (
                  <tr
                    key={r.key}
                    className={`border-b border-stone-100 ${
                      isRec ? "bg-amber-50" : ""
                    }`}
                  >
                    <td className="py-1.5 pr-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate min-w-0" title={r.label}>
                          {r.label}
                        </span>
                        {isRec && (
                          <span className="shrink-0 text-[9px] px-1 py-px rounded bg-amber-200 text-amber-900 font-semibold">
                            推奨
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      className={`py-1.5 text-right tabular-nums whitespace-nowrap ${
                        showCount ? "font-medium" : "text-stone-500"
                      }`}
                    >
                      {r.count}
                    </td>
                    <td className="py-1.5 text-right tabular-nums whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 min-w-0">
                        <div
                          className="h-1 bg-emerald-200 rounded shrink-0 hidden sm:block"
                          style={{ width: `${Math.max(barW * 0.18, 2)}px` }}
                        />
                        <span>
                          {r.avgOpenRate > 0 ? r.avgOpenRate.toFixed(1) + "%" : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="py-1.5 text-right tabular-nums whitespace-nowrap">
                      {r.avgTxRate > 0 ? r.avgTxRate.toFixed(1) + "%" : "—"}
                    </td>
                    <td className="py-1.5 text-right tabular-nums whitespace-nowrap">
                      {r.avgRevPerSent > 0
                        ? "¥" + r.avgRevPerSent.toFixed(1)
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {singleRow && emptyHint && emptyHint !== "—" && (
            <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-2 leading-snug">
              💡 {emptyHint}
            </div>
          )}
          {!singleRow && recommendedKey === null && rows.some((r) => r.count < 2) && (
            <div className="text-[10px] text-stone-400 mt-2">
              ※ 各区分で2件以上のデータが揃うと推奨が表示されます
            </div>
          )}
        </>
      )}
    </div>
  );
}

// -----------------------------------------
// 月次サマリー（RMS 月次指標スタイル）
// -----------------------------------------

type PeriodMetrics = {
  count: number;
  sent: number;
  /** 無料枠で配信した送信数 */
  freeSent: number;
  /** 有料（課金対象）で配信した送信数 */
  paidSent: number;
  opens: number;
  openRate: number;
  clicks: number;
  visitors: number;
  visitorRate: number;
  favorites: number;
  favoriteRate: number;
  txs: number;
  txRate: number;
  revenue: number;
  revenuePerSent: number;
  /** 各メトリクスのデータが1件でも存在したかどうか。false ならカードで「—」を表示 */
  has: {
    sent: boolean;
    opens: boolean;
    clicks: boolean;
    visitors: boolean;
    favorites: boolean;
    txs: boolean;
    revenue: boolean;
  };
};

function computePeriodMetrics(outputs: MailOutput[]): PeriodMetrics {
  let count = 0,
    sent = 0,
    freeSent = 0,
    paidSent = 0,
    opens = 0,
    clicks = 0,
    visitors = 0,
    favorites = 0,
    txs = 0,
    revenue = 0;
  const has = {
    sent: false,
    opens: false,
    clicks: false,
    visitors: false,
    favorites: false,
    txs: false,
    revenue: false,
  };
  for (const o of outputs) {
    const r = o.results;
    if (!r) continue;
    count++;
    if (typeof r.sentCount === "number") {
      sent += r.sentCount;
      has.sent = true;
      if (r.rakuten?.isFreeQuota) {
        freeSent += r.sentCount;
      } else {
        paidSent += r.sentCount;
      }
    }
    if (typeof r.openCount === "number") {
      opens += r.openCount;
      has.opens = true;
    }
    if (typeof r.clickCount === "number") {
      clicks += r.clickCount;
      has.clicks = true;
    }
    if (typeof r.salesAmount === "number") {
      revenue += r.salesAmount;
      has.revenue = true;
    }
    if (typeof r.salesCount === "number") {
      txs += r.salesCount;
      has.txs = true;
    }
    const rk = r.rakuten;
    if (typeof rk?.conversionVisitCount === "number") {
      visitors += rk.conversionVisitCount;
      has.visitors = true;
    }
    if (typeof rk?.favoriteCount === "number") {
      favorites += rk.favoriteCount;
      has.favorites = true;
    }
  }
  return {
    count,
    sent,
    freeSent,
    paidSent,
    opens,
    clicks,
    visitors,
    favorites,
    txs,
    revenue,
    openRate: sent > 0 ? (opens / sent) * 100 : 0,
    visitorRate: sent > 0 ? (visitors / sent) * 100 : 0,
    favoriteRate: visitors > 0 ? (favorites / visitors) * 100 : 0,
    txRate: visitors > 0 ? (txs / visitors) * 100 : 0,
    revenuePerSent: sent > 0 ? revenue / sent : 0,
    has,
  };
}

/** "2026-05" → "2026-04"（1月→前年12月） */
function prevMonthKey(ym: string): string | null {
  const m = ym.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  let y = parseInt(m[1], 10);
  let mo = parseInt(m[2], 10) - 1;
  if (mo === 0) {
    mo = 12;
    y--;
  }
  return `${y}-${String(mo).padStart(2, "0")}`;
}

/** 配信日（sentAt > scheduledAt > createdAt）を ms タイムスタンプで返す */
function sendTimeMs(o: MailOutput): number | null {
  const iso = o.results?.rakuten?.sentStartAt ?? o.sentAt ?? o.scheduledAt ?? o.createdAt;
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return isNaN(t) ? null : t;
}

type DateBucket = {
  /** null = 全期間 */
  range: { from: number; to: number } | null;
  prevRange: { from: number; to: number } | null;
  heading: string;
  prevLabel: string;
};

function getDateBucket(range: SummaryRange, filterMonth: string): DateBucket {
  const now = Date.now();
  if (range === "all") {
    return { range: null, prevRange: null, heading: "全期間の指標", prevLabel: "" };
  }
  if (range === "month") {
    if (!filterMonth) {
      return { range: null, prevRange: null, heading: "月別（月を選択）", prevLabel: "" };
    }
    const m = filterMonth.match(/^(\d{4})-(\d{2})$/);
    if (!m) return { range: null, prevRange: null, heading: "月別", prevLabel: "" };
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    // JST の月境界 = UTC の月初 00:00 - 9h
    const from = new Date(Date.UTC(y, mo - 1, 1, -9, 0, 0)).getTime();
    const to = new Date(Date.UTC(y, mo, 1, -9, 0, 0)).getTime();
    const prevFromY = mo === 1 ? y - 1 : y;
    const prevFromMo = mo === 1 ? 12 : mo - 1;
    const prevFrom = new Date(Date.UTC(prevFromY, prevFromMo - 1, 1, -9, 0, 0)).getTime();
    const prevTo = from;
    const prevKey = prevMonthKey(filterMonth);
    return {
      range: { from, to },
      prevRange: { from: prevFrom, to: prevTo },
      heading: `${formatMonthLabel(filterMonth)}の月次指標`,
      prevLabel: prevKey ? formatMonthLabel(prevKey) : "前月",
    };
  }
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const span = days * 86400000;
  const to = now;
  const from = now - span;
  const prevTo = from;
  const prevFrom = from - span;
  return {
    range: { from, to },
    prevRange: { from: prevFrom, to: prevTo },
    heading: `直近${days}日の指標`,
    prevLabel: `その前の${days}日`,
  };
}

function MonthlySummary({
  withResults,
  range,
  filterMonth,
  availableMonths,
  onRangeChange,
  onFilterMonthChange,
  extraFilter,
}: {
  withResults: MailOutput[];
  range: SummaryRange;
  filterMonth: string;
  availableMonths: string[];
  onRangeChange: (r: SummaryRange) => void;
  onFilterMonthChange: (ym: string) => void;
  /** 月・期間以外の条件で絞り込むフィルター */
  extraFilter: (o: MailOutput) => boolean;
}) {
  const bucket = getDateBucket(range, filterMonth);
  const inRange = (o: MailOutput, r: { from: number; to: number } | null) => {
    if (!extraFilter(o)) return false;
    if (!r) return true;
    const t = sendTimeMs(o);
    if (t === null) return false;
    return t >= r.from && t < r.to;
  };
  const currentList = withResults.filter((o) => inRange(o, bucket.range));
  const prevList = bucket.prevRange
    ? withResults.filter((o) => inRange(o, bucket.prevRange))
    : null;
  const cur = computePeriodMetrics(currentList);
  const prev = prevList ? computePeriodMetrics(prevList) : null;

  const tabs: { key: SummaryRange; label: string }[] = [
    { key: "all", label: "全期間" },
    { key: "7d", label: "直近7日" },
    { key: "30d", label: "直近30日" },
    { key: "90d", label: "直近90日" },
    { key: "month", label: "月別" },
  ];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="text-lg font-semibold">{bucket.heading}</h2>
          {prev && (
            <span className="text-[11px] text-stone-500">
              {bucket.prevLabel}（{prev.count}件）と比較
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="inline-flex rounded-md border border-stone-300 overflow-hidden bg-white">
            {tabs.map((t) => {
              const active = range === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => onRangeChange(t.key)}
                  className={`px-3 py-1.5 text-xs ${
                    active
                      ? "bg-stone-800 text-white font-medium"
                      : "text-stone-600 hover:bg-stone-100"
                  } ${t.key !== "all" ? "border-l border-stone-300" : ""}`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          {range === "month" && availableMonths.length > 0 && (
            <select
              value={filterMonth}
              onChange={(e) => onFilterMonthChange(e.target.value)}
              className="text-xs border border-stone-300 rounded px-2 py-1.5 bg-white"
            >
              <option value="">月を選択</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* メイン2カード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <BigStat
          icon="💰"
          label="売上"
          value={cur.has.revenue ? `¥${fmt(cur.revenue)}` : "—"}
          delta={
            prev && cur.has.revenue && prev.has.revenue
              ? pctDelta(cur.revenue, prev.revenue)
              : null
          }
          deltaUnit="%"
        />
        <BigStat
          icon="📨"
          label="売上/通"
          value={
            cur.has.revenue && cur.has.sent
              ? `¥${cur.revenuePerSent.toFixed(1)}`
              : "—"
          }
          delta={
            prev && cur.has.revenue && cur.has.sent && prev.has.revenue && prev.has.sent
              ? pctDelta(cur.revenuePerSent, prev.revenuePerSent)
              : null
          }
          deltaUnit="%"
        />
      </div>

      {/* サブ7カード */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SubStat
          label="配信回数"
          value={fmt(cur.count)}
          unit="回"
          delta={prev ? cur.count - prev.count : null}
          deltaUnit="回"
          deltaPrecision={0}
        />
        <SubStat
          label="送信数"
          value={cur.has.sent ? fmt(cur.sent) : "—"}
          unit={cur.has.sent ? "通" : ""}
          sub={
            cur.has.sent && (cur.freeSent > 0 || cur.paidSent > 0)
              ? `無料 ${fmt(cur.freeSent)} / 有料 ${fmt(cur.paidSent)}`
              : "通数（送信費用とは別）"
          }
          delta={
            prev && cur.has.sent && prev.has.sent ? pctDelta(cur.sent, prev.sent) : null
          }
          deltaUnit="%"
        />
        <SubStat
          label="開封率"
          value={cur.has.opens && cur.has.sent ? cur.openRate.toFixed(1) : "—"}
          unit={cur.has.opens && cur.has.sent ? "%" : ""}
          sub={cur.has.opens && cur.opens > 0 ? `(${fmt(cur.opens)}件)` : undefined}
          delta={
            prev && cur.has.opens && cur.has.sent && prev.has.opens && prev.has.sent
              ? cur.openRate - prev.openRate
              : null
          }
          deltaUnit="pt"
          deltaPrecision={1}
        />
        <SubStat
          label="クリック数"
          value={cur.has.clicks ? fmt(cur.clicks) : "—"}
          unit={cur.has.clicks ? "件" : ""}
          delta={
            prev && cur.has.clicks && prev.has.clicks
              ? pctDelta(cur.clicks, prev.clicks)
              : null
          }
          deltaUnit="%"
        />
        <SubStat
          label="送客率"
          value={cur.has.visitors && cur.has.sent ? cur.visitorRate.toFixed(1) : "—"}
          unit={cur.has.visitors && cur.has.sent ? "%" : ""}
          sub={cur.has.visitors && cur.visitors > 0 ? `(${fmt(cur.visitors)}件)` : undefined}
          delta={
            prev && cur.has.visitors && cur.has.sent && prev.has.visitors && prev.has.sent
              ? cur.visitorRate - prev.visitorRate
              : null
          }
          deltaUnit="pt"
          deltaPrecision={1}
        />
        <SubStat
          label="お気に入り登録率"
          value={
            cur.has.favorites && cur.has.visitors ? cur.favoriteRate.toFixed(1) : "—"
          }
          unit={cur.has.favorites && cur.has.visitors ? "%" : ""}
          sub={cur.has.favorites && cur.favorites > 0 ? `(${fmt(cur.favorites)}件)` : undefined}
          delta={
            prev && cur.has.favorites && cur.has.visitors && prev.has.favorites && prev.has.visitors
              ? cur.favoriteRate - prev.favoriteRate
              : null
          }
          deltaUnit="pt"
          deltaPrecision={1}
        />
        <SubStat
          label="転換率"
          value={cur.has.txs && cur.has.visitors ? cur.txRate.toFixed(1) : "—"}
          unit={cur.has.txs && cur.has.visitors ? "%" : ""}
          sub={cur.has.txs && cur.txs > 0 ? `(${fmt(cur.txs)}件)` : undefined}
          delta={
            prev && cur.has.txs && cur.has.visitors && prev.has.txs && prev.has.visitors
              ? cur.txRate - prev.txRate
              : null
          }
          deltaUnit="pt"
          deltaPrecision={1}
        />
        {/* 4n でグリッドを揃えるための空セル */}
        <div className="hidden sm:block" />
      </div>
    </section>
  );
}

function pctDelta(cur: number, prev: number): number | null {
  if (!prev || prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

function BigStat({
  icon,
  label,
  value,
  delta,
  deltaUnit,
  sub,
}: {
  icon?: string;
  label: string;
  value: string;
  delta: number | null;
  deltaUnit: string;
  sub?: string;
}) {
  return (
    <div className="border border-stone-200 rounded bg-white p-6">
      <div className="text-sm text-stone-600 flex items-center gap-1.5">
        {icon && <span aria-hidden className="text-base">{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="mt-3 text-4xl sm:text-5xl font-bold tabular-nums leading-none">
        {value}
      </div>
      {sub && <div className="text-[11px] text-stone-400 mt-1.5">{sub}</div>}
      <DeltaPill delta={delta} unit={deltaUnit} large />
    </div>
  );
}

function SubStat({
  label,
  value,
  unit,
  sub,
  delta,
  deltaUnit,
  deltaPrecision,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  delta: number | null;
  deltaUnit: string;
  deltaPrecision?: number;
}) {
  return (
    <div className="border border-stone-200 rounded bg-white p-4">
      <div className="text-xs text-stone-600">{label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl sm:text-3xl font-bold tabular-nums leading-none">
          {value}
        </span>
        {unit && <span className="text-xs text-stone-500">{unit}</span>}
      </div>
      {sub && <div className="text-[11px] text-stone-400 mt-1">{sub}</div>}
      <DeltaPill delta={delta} unit={deltaUnit} precision={deltaPrecision} />
    </div>
  );
}

function DeltaPill({
  delta,
  unit,
  precision,
  large,
}: {
  delta: number | null;
  unit: string;
  precision?: number;
  large?: boolean;
}) {
  if (delta === null) {
    // 余白を揃える
    return <div className={large ? "h-4 mt-2" : "h-3.5 mt-1.5"} />;
  }
  const isZero = Math.abs(delta) < 0.05;
  const isPositive = delta > 0;
  const sign = isZero ? "" : isPositive ? "+" : "";
  const arrow = isZero ? "→" : isPositive ? "▲" : "▼";
  const color = isZero
    ? "text-stone-400"
    : isPositive
      ? "text-sky-700"
      : "text-rose-700";
  const p = precision ?? 1;
  return (
    <div
      className={`${large ? "text-xs mt-2" : "text-[10px] mt-1.5"} leading-none ${color} tabular-nums`}
    >
      前期比 {sign}
      {delta.toFixed(p)}
      {unit}{" "}
      <span className={large ? "text-[10px]" : "text-[9px]"}>{arrow}</span>
    </div>
  );
}

// -----------------------------------------

function DeviceBox({ rows }: { rows: DeviceTotalRow[] }) {
  const total = rows.reduce((s, r) => s + r.revenue, 0);
  return (
    <div className="border border-stone-200 rounded bg-white p-4">
      <h3 className="text-sm font-semibold">デバイス別合算</h3>
      <div className="text-[10px] text-stone-500 mt-0.5 leading-snug">
        全配信のデバイス別合算。スマホ vs PC の構成比
      </div>
      {rows.length === 0 ? (
        <div className="text-xs text-stone-400 py-3">
          デバイス別データはまだ取り込まれていません。RMS から「📨 メルマガ分析取得」を実行すると表示されます
        </div>
      ) : (
        <table className="w-full text-xs mt-3">
          <thead className="text-stone-500">
            <tr className="border-b border-stone-200">
              <th className="text-left py-1.5 font-medium">デバイス</th>
              <th className="text-right py-1.5 font-medium">開封</th>
              <th className="text-right py-1.5 font-medium">クリック</th>
              <th className="text-right py-1.5 font-medium">売上</th>
              <th className="text-right py-1.5 font-medium">構成比</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const share = total > 0 ? (r.revenue / total) * 100 : 0;
              return (
                <tr key={r.device} className="border-b border-stone-100">
                  <td className="py-1.5">{r.label}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {fmt(r.opens)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">
                    {fmt(r.clicks)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">
                    ¥{fmt(r.revenue)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-stone-500">
                    {share.toFixed(0)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
