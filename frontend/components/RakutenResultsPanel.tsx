"use client";

import type { RakutenRMailMetrics } from "@/lib/types";

const DEVICE_LABEL: Record<string, string> = {
  pc: "PC",
  smartphone: "スマートフォン",
  tablet: "タブレット",
  app: "アプリ",
  total: "合計",
};

export default function RakutenResultsPanel({
  metrics,
}: {
  metrics: RakutenRMailMetrics;
}) {
  const hasAny =
    metrics.mailId ||
    metrics.conversionVisitCount !== undefined ||
    metrics.transactionCount !== undefined ||
    (metrics.deviceBreakdown && metrics.deviceBreakdown.length > 0);

  if (!hasAny) return null;

  return (
    <div className="border border-stone-200 rounded bg-white p-5 space-y-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-xs text-stone-500">楽天 R-Mail 取り込みデータ</div>
          {metrics.mailId && (
            <div className="text-sm font-medium mt-0.5">
              メルマガID: {metrics.mailId}
            </div>
          )}
        </div>
        {metrics.importedAt && (
          <div className="text-xs text-stone-500">
            最終取り込み: {new Date(metrics.importedAt).toLocaleString("ja-JP")}
          </div>
        )}
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Metric
          label="送客率"
          value={metrics.conversionVisitRate}
          unit="%"
          diff={metrics.conversionVisitRateDiffPt}
        />
        <Metric
          label="送客数"
          value={metrics.conversionVisitCount}
          unit="件"
        />
        <Metric label="転換数" value={metrics.transactionCount} unit="件" />
        <Metric
          label="転換率"
          value={metrics.transactionRate}
          unit="%"
          step={2}
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
        <Metric label="売上/通" value={metrics.revenuePerSent} unit="円" />
      </div>

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
                      d.device === "total"
                        ? "font-semibold bg-stone-50"
                        : ""
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

function Metric({
  label,
  value,
  unit,
  diff,
  step,
}: {
  label: string;
  value: number | undefined;
  unit: string;
  diff?: number;
  step?: number;
}) {
  if (value === undefined) {
    return (
      <div>
        <div className="text-xs text-stone-500">{label}</div>
        <div className="text-stone-400 mt-0.5">—</div>
      </div>
    );
  }
  return (
    <div>
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-0.5">
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

function fmt(n: number | undefined): string {
  if (n === undefined) return "—";
  return n.toLocaleString("ja-JP");
}

function fmtPct(n: number | undefined): string {
  if (n === undefined) return "—";
  return `${n.toFixed(1)}%`;
}
