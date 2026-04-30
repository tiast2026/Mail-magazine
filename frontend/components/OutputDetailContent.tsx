"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { BrandConfig, MailOutput } from "@/lib/types";
import { applyBrandToHtml } from "@/lib/brand";
import { useOptimisticOutput } from "@/lib/optimistic";
import HtmlPreview from "./HtmlPreview";

/** "5,900円" / "¥5900" 等から数値を抽出して割引率（整数%）を返す */
function computeDiscountPercent(
  regular?: string,
  sale?: string,
): number | null {
  if (!regular || !sale) return null;
  const r = parseInt(regular.replace(/[^\d]/g, ""), 10);
  const s = parseInt(sale.replace(/[^\d]/g, ""), 10);
  if (!r || !s || r <= s) return null;
  return Math.round(((r - s) / r) * 100);
}
import CopyButton from "./CopyButton";
import EventBadge from "./EventBadge";
import OutputEditor from "./OutputEditor";
import RakutenResultsPanel from "./RakutenResultsPanel";

export default function OutputDetailContent({
  brandId,
  brand,
  initialOutput,
}: {
  brandId: string;
  brand: BrandConfig;
  initialOutput: MailOutput;
}) {
  const router = useRouter();
  const { data: output, isDeleted } = useOptimisticOutput(initialOutput);

  useEffect(() => {
    if (isDeleted) {
      router.push("/outputs/");
    }
  }, [isDeleted, router]);

  if (isDeleted) {
    return (
      <div className="text-sm text-stone-500">
        このメルマガは削除されました。一覧へ戻ります...
      </div>
    );
  }

  const htmlWithBrand = applyBrandToHtml(output.html, brand);

  return (
    <div className="space-y-6">
      <div className="text-sm">
        <Link href="/outputs" className="text-stone-600 hover:text-stone-900">
          ← 配信メルマガ一覧へ
        </Link>
      </div>

      <section>
        <div className="text-xs text-stone-500">
          テンプレ {output.templateId} ・{" "}
          {new Date(output.createdAt).toLocaleString("ja-JP")} 生成
        </div>
        <h1 className="text-2xl font-semibold mt-1">{output.title}</h1>

        <div className="mt-3 flex flex-wrap gap-2 items-center">
          {output.event && <EventBadge event={output.event} size="md" />}
          {output.event?.name && (
            <span className="text-xs text-stone-600">{output.event.name}</span>
          )}
        </div>

        <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {output.scheduledAt && (
            <div className="card p-3">
              <dt className="text-stone-500">配信予定</dt>
              <dd className="mt-1 font-medium">
                {new Date(output.scheduledAt).toLocaleString("ja-JP", {
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </dd>
            </div>
          )}
          {output.sentAt && (
            <div className="card p-3">
              <dt className="text-stone-500">実配信</dt>
              <dd className="mt-1 font-medium">
                {new Date(output.sentAt).toLocaleString("ja-JP", {
                  month: "numeric",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </dd>
            </div>
          )}
          {output.event?.startDate && output.event?.endDate && (
            <div className="card p-3 col-span-2">
              <dt className="text-stone-500">イベント期間</dt>
              <dd className="mt-1 text-xs">
                {new Date(output.event.startDate).toLocaleDateString("ja-JP")}{" "}
                〜 {new Date(output.event.endDate).toLocaleDateString("ja-JP")}
              </dd>
            </div>
          )}
        </dl>

        {output.tags && output.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {output.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-stone-100 text-stone-700 rounded-full px-3 py-1"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">使用商品</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {output.products.map((p, i) => (
            <li
              key={i}
              className="border border-stone-200 rounded bg-white p-3 flex gap-3 items-start"
            >
              {p.imageUrl && (
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="w-16 h-16 object-cover rounded shrink-0"
                />
              )}
              <div className="min-w-0 text-sm">
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium hover:underline block truncate"
                >
                  {p.name}
                </a>
                {p.manageNumber && (
                  <div className="text-xs text-stone-500 mt-0.5">
                    品番: {p.manageNumber}
                  </div>
                )}
                <div className="text-xs mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  {p.regularPrice && (
                    <span className="text-stone-500 line-through">
                      {p.regularPrice}
                    </span>
                  )}
                  {p.salePrice && (
                    <span
                      className="font-semibold"
                      style={{ color: "var(--brand-accent)" }}
                    >
                      {p.salePrice}
                    </span>
                  )}
                  {(() => {
                    const off = computeDiscountPercent(
                      p.regularPrice,
                      p.salePrice,
                    );
                    if (off == null) return null;
                    return (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
                        style={{ backgroundColor: "var(--brand-accent)" }}
                      >
                        {off}%OFF
                      </span>
                    );
                  })()}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">プレビュー</h2>
          <CopyButton text={htmlWithBrand} label="HTMLをコピー" />
        </div>
        <HtmlPreview html={htmlWithBrand} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">配信実績</h2>
        {output.results?.rakuten ? (
          <RakutenResultsPanel metrics={output.results.rakuten} />
        ) : (
          <div className="border border-dashed border-stone-300 rounded bg-stone-50 px-5 py-8 text-center text-sm text-stone-500">
            まだ R-Mail から実績が取り込まれていません。<br />
            配信完了後、Tampermonkey スクリプトで取り込むとここに表示されます。
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">編集・削除</h2>
        <OutputEditor brandId={brandId} output={output} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">HTML ソース</h2>
        <pre className="bg-stone-900 text-stone-100 text-xs rounded p-4 overflow-auto max-h-96">
          {htmlWithBrand}
        </pre>
      </section>
    </div>
  );
}
