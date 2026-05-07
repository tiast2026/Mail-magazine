"use client";

import type {
  AiAnalysis,
  OutputResults,
  RakutenRMailMetrics,
} from "@/lib/types";

const DEVICE_LABEL: Record<string, string> = {
  pc: "PC",
  smartphone: "スマートフォン",
  tablet: "タブレット",
  app: "アプリ",
  total: "合計",
};

export default function RakutenResultsPanel({
  results,
  brandId,
  outputId,
}: {
  results: OutputResults;
  brandId?: string;
  outputId?: string;
}) {
  const metrics: RakutenRMailMetrics = results.rakuten ?? {};
  const hasAny =
    metrics.mailId ||
    results.sentCount !== undefined ||
    results.openCount !== undefined ||
    metrics.conversionVisitCount !== undefined ||
    metrics.transactionCount !== undefined ||
    (metrics.deviceBreakdown && metrics.deviceBreakdown.length > 0);

  if (!hasAny) return null;

  // 派生指標
  const ctr =
    results.openCount && results.clickCount
      ? (results.clickCount / results.openCount) * 100
      : undefined;
  const cvr =
    metrics.conversionVisitCount && metrics.transactionCount
      ? (metrics.transactionCount / metrics.conversionVisitCount) * 100
      : undefined;
  const salesTotal =
    results.salesAmount ??
    (metrics.revenuePerSent && results.sentCount
      ? Math.round(metrics.revenuePerSent * results.sentCount)
      : undefined);

  // 鮮度（暫定 / 確定）判定
  const importedAt = metrics.importedAt
    ? new Date(metrics.importedAt)
    : undefined;
  const ageHours = importedAt
    ? (Date.now() - importedAt.getTime()) / (1000 * 60 * 60)
    : undefined;
  const sendBaseAt =
    metrics.sentStartAt ??
    metrics.sentEndAt ??
    metrics.importedAt;
  const sinceSendHours = sendBaseAt
    ? (Date.now() - new Date(sendBaseAt).getTime()) / (1000 * 60 * 60)
    : undefined;
  const isProvisional =
    sinceSendHours !== undefined && sinceSendHours < 72;

  return (
    <div className="border border-stone-200 rounded bg-white p-5 space-y-5">
      {/* ヘッダー */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-stone-500">
              楽天 R-Mail 取り込みデータ
            </span>
            {isProvisional ? (
              <span
                title="配信から72時間以内のため、開封・送客・転換は今後増える可能性があります"
                className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200"
              >
                ⏳ 集計中（暫定値）
              </span>
            ) : (
              <span
                title="配信から72時間以上経過した数値です"
                className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200"
              >
                ✓ 確定値
              </span>
            )}
            {metrics.isFreeQuota && (
              <span
                title="無料枠で配信されたメルマガ。料金がかかっていません。"
                className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200"
              >
                💰 無料枠
              </span>
            )}
          </div>
          {metrics.mailId && (
            <div className="text-sm font-medium mt-0.5">
              メルマガID: {metrics.mailId}
            </div>
          )}
          {metrics.subject && (
            <div className="text-xs text-stone-500 mt-0.5 truncate max-w-xl">
              RMS件名: {metrics.subject}
            </div>
          )}
          {metrics.listCondition && (
            <div
              className="text-xs text-stone-500 mt-0.5 truncate max-w-xl"
              title={metrics.listCondition}
            >
              配信先（リスト条件）: {metrics.listCondition}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          {importedAt && (
            <div className="text-xs text-stone-500">
              最終取り込み:{" "}
              <span className="text-stone-700">
                {importedAt.toLocaleString("ja-JP")}
              </span>
              {ageHours !== undefined && (
                <span className="text-stone-400 ml-1">
                  ({formatRelative(ageHours)})
                </span>
              )}
            </div>
          )}
          <div className="text-[10px] text-stone-400 mt-1">
            数値を更新するには R-Mail で再取り込み
          </div>
        </div>
      </header>

      {/* 配信時刻・期間 */}
      {(metrics.sentStartAt ||
        metrics.sentEndAt ||
        metrics.aggregateFrom ||
        metrics.aggregateTo) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-stone-50 rounded p-3 border border-stone-100">
          {metrics.sentStartAt && (
            <KV label="配信開始（RMS）" value={fmtDateTime(metrics.sentStartAt)} />
          )}
          {metrics.sentEndAt && (
            <KV label="配信完了（RMS）" value={fmtDateTime(metrics.sentEndAt)} />
          )}
          {metrics.aggregateFrom && (
            <KV
              label="集計開始"
              value={fmtDate(metrics.aggregateFrom)}
            />
          )}
          {metrics.aggregateTo && (
            <KV
              label="集計終了"
              value={fmtDate(metrics.aggregateTo)}
            />
          )}
        </div>
      )}

      {/* セクション: 配信・開封・クリック */}
      <section>
        <h3 className="text-xs font-semibold text-stone-700 mb-2">
          配信・開封・クリック
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Metric label="送信数" value={results.sentCount} unit="通" />
          <Metric
            label="開封数"
            value={results.openCount}
            unit="件"
          />
          <Metric
            label="開封率"
            value={results.openRate}
            unit="%"
            step={1}
            diff={metrics.openRateDiffPt}
          />
          <Metric
            label="クリック数"
            value={results.clickCount}
            unit="件"
          />
        </div>
      </section>

      {/* セクション: 送客・転換 */}
      <section>
        <h3 className="text-xs font-semibold text-stone-700 mb-2">
          送客・転換・売上
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Metric
            label="送客数"
            value={metrics.conversionVisitCount}
            unit="件"
          />
          <Metric
            label="送客率"
            value={metrics.conversionVisitRate}
            unit="%"
            step={1}
            diff={metrics.conversionVisitRateDiffPt}
          />
          <Metric
            label="転換数"
            value={metrics.transactionCount}
            unit="件"
          />
          <Metric
            label="転換率"
            value={metrics.transactionRate}
            unit="%"
            step={2}
          />
          <Metric
            label="売上/通"
            value={metrics.revenuePerSent}
            unit="円"
            step={1}
          />
          <Metric
            label="売上合計"
            value={salesTotal}
            unit="円"
            prefix="¥"
          />
          <Metric
            label="お気に入り登録"
            value={metrics.favoriteCount}
            unit="件"
          />
          <Metric
            label="お気に入り登録率"
            value={metrics.favoriteRate}
            unit="%"
            step={2}
          />
        </div>
      </section>

      {/* セクション: 派生指標 */}
      {(ctr !== undefined || cvr !== undefined) && (
        <section>
          <h3 className="text-xs font-semibold text-stone-700 mb-2">
            派生指標
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Metric
              label="CTR"
              value={ctr}
              unit="%"
              step={2}
              hint="クリック数 ÷ 開封数"
            />
            <Metric
              label="CVR"
              value={cvr}
              unit="%"
              step={2}
              hint="転換数 ÷ 送客数"
            />
          </div>
        </section>
      )}

      {/* デバイス別 */}
      {metrics.deviceBreakdown && metrics.deviceBreakdown.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-stone-700 mb-2">
            デバイス別
          </h3>
          <div className="overflow-x-auto">
            <table className="text-xs w-full border-collapse">
              <thead>
                <tr className="bg-stone-50 text-stone-600">
                  <th className="text-left py-1 px-2 border-b border-stone-200">
                    デバイス
                  </th>
                  <th className="text-right py-1 px-2 border-b border-stone-200">
                    開封数
                  </th>
                  <th className="text-right py-1 px-2 border-b border-stone-200">
                    開封率
                  </th>
                  <th className="text-right py-1 px-2 border-b border-stone-200">
                    クリック
                  </th>
                  <th className="text-right py-1 px-2 border-b border-stone-200">
                    送客
                  </th>
                  <th className="text-right py-1 px-2 border-b border-stone-200">
                    転換
                  </th>
                  <th className="text-right py-1 px-2 border-b border-stone-200">
                    売上
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.deviceBreakdown.map((d) => (
                  <tr
                    key={d.device}
                    className={
                      d.device === "total" ? "font-semibold bg-stone-50" : ""
                    }
                  >
                    <td className="py-1 px-2 border-b border-stone-100">
                      {DEVICE_LABEL[d.device] ?? d.device}
                    </td>
                    <td className="text-right py-1 px-2 border-b border-stone-100">
                      {fmt(d.opens)}
                    </td>
                    <td className="text-right py-1 px-2 border-b border-stone-100">
                      {fmtPct(d.openRate)}
                    </td>
                    <td className="text-right py-1 px-2 border-b border-stone-100">
                      {fmt(d.clicks)}
                    </td>
                    <td className="text-right py-1 px-2 border-b border-stone-100">
                      {fmt(d.sent)}
                    </td>
                    <td className="text-right py-1 px-2 border-b border-stone-100">
                      {fmt(d.conversions)}
                    </td>
                    <td className="text-right py-1 px-2 border-b border-stone-100">
                      {d.revenue !== undefined ? `¥${fmt(d.revenue)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 日別推移 */}
      {metrics.dailyTrend && metrics.dailyTrend.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-stone-700 mb-2">
            日別推移
          </h3>
          <div className="overflow-x-auto">
            <table className="text-xs w-full border-collapse">
              <thead>
                <tr className="bg-stone-50 text-stone-600">
                  <th className="text-left py-1 px-2 border-b border-stone-200">
                    日付
                  </th>
                  <th className="text-right py-1 px-2 border-b border-stone-200">
                    開封
                  </th>
                  <th className="text-right py-1 px-2 border-b border-stone-200">
                    送客
                  </th>
                  <th className="text-right py-1 px-2 border-b border-stone-200">
                    転換
                  </th>
                </tr>
              </thead>
              <tbody>
                {metrics.dailyTrend.map((d) => (
                  <tr key={d.date}>
                    <td className="py-1 px-2 border-b border-stone-100">
                      {d.date}
                    </td>
                    <td className="text-right py-1 px-2 border-b border-stone-100">
                      {fmt(d.opens)}
                    </td>
                    <td className="text-right py-1 px-2 border-b border-stone-100">
                      {fmt(d.sends)}
                    </td>
                    <td className="text-right py-1 px-2 border-b border-stone-100">
                      {fmt(d.conversions)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* AI 分析 */}
      <AiAnalysisSection
        analysis={results.aiAnalysis}
        brandId={brandId}
        outputId={outputId}
      />

      {metrics.sourceUrl && (
        <div className="text-xs text-stone-500">
          <a
            href={metrics.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-stone-700"
          >
            R-Mail 元ページを開く →
          </a>
        </div>
      )}
    </div>
  );
}

function AiAnalysisSection({
  analysis,
  outputId,
}: {
  analysis?: AiAnalysis;
  brandId?: string;
  outputId?: string;
}) {
  if (!analysis) {
    return (
      <section className="border border-dashed border-stone-300 rounded p-4 bg-stone-50">
        <h3 className="text-sm font-semibold text-stone-700">🤖 AI 分析</h3>
        <p className="text-xs text-stone-500 mt-1 leading-relaxed">
          配信から 1週間経過したメルマガは Claude Code セッション側で分析できます。<br />
          チャットで「<span className="font-medium text-stone-700">{outputId ?? "<id>"} を分析して</span>」と頼むと、過去データと比較した分析結果が振り返り欄に書き込まれます。
        </p>
      </section>
    );
  }

  return (
    <section className="border border-stone-200 rounded p-4 bg-amber-50/30">
      <header className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-stone-800">🤖 AI 分析</h3>
          <ScoreBadge score={analysis.score} />
          <span className="text-[10px] text-stone-500">
            {new Date(analysis.analyzedAt).toLocaleString("ja-JP")} ・{" "}
            {analysis.model}
          </span>
        </div>
      </header>

      <p className="text-sm text-stone-800 leading-relaxed mb-3">
        {analysis.summary}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <BulletBox
          title="✅ 良かった点"
          tone="emerald"
          items={analysis.strengths}
        />
        <BulletBox
          title="⚠️ 改善余地"
          tone="rose"
          items={analysis.weaknesses}
        />
        <BulletBox
          title="🎯 次回アクション"
          tone="indigo"
          items={analysis.nextActions}
        />
      </div>

      {analysis.comparedAgainst && analysis.comparedAgainst.length > 0 && (
        <div className="text-[10px] text-stone-400 mt-3">
          比較対象: {analysis.comparedAgainst.length}件の過去配信
        </div>
      )}
    </section>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const label =
    score === 5
      ? "大成功"
      : score === 4
        ? "好調"
        : score === 3
          ? "平均並"
          : score === 2
            ? "やや低調"
            : "苦戦";
  const color =
    score >= 4
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : score === 3
        ? "bg-stone-100 text-stone-700 border-stone-200"
        : "bg-rose-100 text-rose-700 border-rose-200";
  return (
    <span
      className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${color}`}
    >
      {"★".repeat(score)} {label}
    </span>
  );
}

function BulletBox({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "emerald" | "rose" | "indigo";
  items: string[];
}) {
  const border = {
    emerald: "border-emerald-200",
    rose: "border-rose-200",
    indigo: "border-indigo-200",
  }[tone];
  return (
    <div className={`bg-white rounded border ${border} p-3`}>
      <div className="text-xs font-semibold text-stone-700 mb-1.5">
        {title}
      </div>
      {items.length === 0 ? (
        <div className="text-stone-400">—</div>
      ) : (
        <ul className="space-y-1 text-stone-700">
          {items.map((it, i) => (
            <li key={i} className="leading-snug">
              ・{it}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  diff,
  step,
  prefix,
  hint,
}: {
  label: string;
  value: number | undefined;
  unit: string;
  diff?: number;
  step?: number;
  prefix?: string;
  hint?: string;
}) {
  if (value === undefined || value === null) {
    return (
      <div title={hint}>
        <div className="text-xs text-stone-500">{label}</div>
        <div className="text-stone-400 mt-0.5">—</div>
      </div>
    );
  }
  return (
    <div title={hint}>
      <div className="text-xs text-stone-500">
        {label}
        {hint && <span className="text-stone-300 ml-0.5">ⓘ</span>}
      </div>
      <div className="mt-0.5">
        {prefix && (
          <span className="text-xs text-stone-500 mr-0.5">{prefix}</span>
        )}
        <span className="text-base font-semibold">
          {step ? value.toFixed(step) : fmt(value)}
        </span>
        <span className="text-xs text-stone-500 ml-0.5">{unit}</span>
      </div>
      {diff !== undefined && (
        <div
          className={`text-[10px] ${diff >= 0 ? "text-emerald-700" : "text-rose-700"}`}
        >
          前月比 {diff > 0 ? "+" : ""}
          {diff.toFixed(1)} pt
        </div>
      )}
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-stone-500">{label}</div>
      <div className="text-stone-800 font-medium mt-0.5">{value}</div>
    </div>
  );
}

function fmt(n: number | undefined): string {
  if (n === undefined || n === null) return "—";
  return n.toLocaleString("ja-JP");
}

function fmtPct(n: number | undefined): string {
  if (n === undefined || n === null) return "—";
  return `${n.toFixed(1)}%`;
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ja-JP");
}

function formatRelative(hours: number): string {
  if (hours < 1) {
    const mins = Math.max(1, Math.round(hours * 60));
    return `${mins}分前`;
  }
  if (hours < 24) return `${Math.round(hours)}時間前`;
  const days = Math.round(hours / 24);
  return `${days}日前`;
}
