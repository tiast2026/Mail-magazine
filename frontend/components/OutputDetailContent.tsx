"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { BrandConfig, Coupon, MailOutput } from "@/lib/types";
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
import HtmlSourceEditor from "./HtmlSourceEditor";
import OutputEditor from "./OutputEditor";
import RakutenResultsPanel from "./RakutenResultsPanel";
import ReflectionEditor from "./ReflectionEditor";

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
  // 編集中の HTML をローカル管理。プレビューはこちらをリアルタイム反映する。
  const [editingHtml, setEditingHtml] = useState(output.html);

  useEffect(() => {
    if (isDeleted) {
      router.push("/outputs/");
    }
  }, [isDeleted, router]);

  // 外部から output.html が更新された場合（保存後の最適化更新）も同期
  useEffect(() => {
    setEditingHtml(output.html);
  }, [output.html]);

  if (isDeleted) {
    return (
      <div className="text-sm text-stone-500">
        このメルマガは削除されました。一覧へ戻ります...
      </div>
    );
  }

  const htmlWithBrand = applyBrandToHtml(editingHtml, brand);

  async function saveHtml(html: string): Promise<void> {
    const res = await fetch(
      `/api/brands/${encodeURIComponent(brandId)}/outputs/${encodeURIComponent(output.id)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? `HTTP ${res.status}`);
    }
  }

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
          {(output.results?.rakuten?.sentStartAt || output.sentAt) && (
            <div className="card p-3">
              <dt className="text-stone-500">
                実配信
                {output.results?.rakuten?.sentStartAt && (
                  <span
                    className="text-[10px] text-emerald-700 ml-1"
                    title="楽天 R-Mail から取得した実際の配信時刻"
                  >
                    RMS
                  </span>
                )}
              </dt>
              <dd className="mt-1 font-medium">
                {new Date(
                  output.results?.rakuten?.sentStartAt ?? output.sentAt!,
                ).toLocaleString("ja-JP", {
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

      <div className="lg:grid lg:grid-cols-5 lg:gap-6 lg:items-start">
        <div className="space-y-6 min-w-0 lg:col-span-3">
      <section>
        <h2 className="text-lg font-semibold mb-2">配信実績</h2>
        {output.results?.rakuten ? (
          <RakutenResultsPanel
            results={output.results}
            brandId={brandId}
            outputId={output.id}
          />
        ) : (
          <div className="border border-dashed border-stone-300 rounded bg-stone-50 px-5 py-8 text-center text-sm text-stone-500">
            まだ R-Mail から実績が取り込まれていません。<br />
            配信完了後、Tampermonkey スクリプトで取り込むとここに表示されます。
          </div>
        )}
      </section>

      <CouponsSection output={output} brandId={brandId} />

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
        <h2 className="text-lg font-semibold mb-2">振り返り</h2>
        <ReflectionEditor brandId={brandId} output={output} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">編集・削除</h2>
        <OutputEditor brandId={brandId} output={output} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">HTML ソース編集</h2>
        <p className="text-xs text-stone-500 mb-2">
          編集すると右のプレビューがリアルタイムで反映されます。⌘S（Ctrl+S）で保存できます。
        </p>
        <HtmlSourceEditor
          initial={output.html}
          onChange={setEditingHtml}
          onSave={saveHtml}
        />
      </section>
        </div>

        <aside className="mt-6 lg:mt-0 lg:sticky lg:top-4 lg:self-start lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">プレビュー</h2>
            <CopyButton text={htmlWithBrand} label="HTMLをコピー" />
          </div>
          <div className="lg:max-h-[calc(100vh-6rem)] lg:overflow-auto rounded border border-stone-200 bg-white">
            <HtmlPreview html={htmlWithBrand} />
          </div>
        </aside>
      </div>
    </div>
  );
}

/** vars.COUPON_URL_<SUFFIX> → 表示ラベル（後方互換用） */
function deriveLabelFromKey(key: string): string {
  // COUPON_URL_50OFF → "50%OFF"
  // COUPON_URL_2POINT_55OFF → "2点で55%OFF"
  const suffix = key.replace(/^COUPON_URL_/, "");
  return suffix
    .replace(/_/g, " ")
    .replace(/(\d+)POINT/i, "$1点で")
    .replace(/(\d+)OFF/i, "$1%OFF")
    .trim();
}

/** クーポンURLから getkey を抽出 */
function extractGetKey(url: string): string | null {
  const m = url.match(/[?&]getkey=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * getkey を couponCode に逆変換。
 * 楽天は `couponCode` の最初の2セグメントを入れ替えて base64 した文字列の `==` を `--` に置換したものを getkey にしている：
 *   AAAA-BBBB-CCCC-DDDD → BBBB-AAAA-CCCC-DDDD → base64 → "..==" → ".." 末尾を `--` に置換
 */
function getKeyToCouponCode(getKey: string): string | null {
  try {
    const padded = getKey.replace(/--$/, "==").replace(/-$/, "=");
    const decoded =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf8");
    const parts = decoded.split("-");
    if (parts.length < 2) return decoded;
    [parts[0], parts[1]] = [parts[1], parts[0]];
    return parts.join("-");
  } catch {
    return null;
  }
}

type CouponDisplay = Coupon & {
  /** RMS から取得したフル名（あればこちらを優先表示） */
  rmsName?: string;
};

function CouponsSection({
  output,
  brandId,
}: {
  output: MailOutput;
  brandId: string;
}) {
  // 1. output.coupons があればそれを表示
  // 2. なければ vars.COUPON_URL_* から後方互換でフォールバック
  const baseCoupons: Coupon[] = (() => {
    if (output.coupons && output.coupons.length > 0) return output.coupons;
    const vars = (output.variables ?? {}) as Record<string, string>;
    return Object.entries(vars)
      .filter(([k, v]) => /^COUPON_URL_/.test(k) && v)
      .map(([k, v]): Coupon => ({ label: deriveLabelFromKey(k), url: v }));
  })();

  const [coupons, setCoupons] = useState<CouponDisplay[]>(baseCoupons);

  // 楽天 RMS からクーポン名を取得して enrich（couponCode で 1 件ずつ取得）
  useEffect(() => {
    if (baseCoupons.length === 0) return;
    let cancelled = false;
    (async () => {
      type RmsCoupon = {
        couponCode?: string;
        name?: string;
        startTime?: string | null;
        endTime?: string | null;
        discountFactor?: number | null;
      };
      const fetchOne = async (
        couponCode: string,
      ): Promise<RmsCoupon | null> => {
        try {
          const r = await fetch(
            `/api/rakuten/${encodeURIComponent(brandId)}/coupons?status=all&couponCode=${encodeURIComponent(couponCode)}`,
            { cache: "no-store" },
          );
          if (!r.ok) return null;
          const data = (await r.json()) as { coupons?: RmsCoupon[] };
          return data.coupons?.[0] ?? null;
        } catch {
          return null;
        }
      };
      const results = await Promise.all(
        baseCoupons.map(async (c) => {
          const key = extractGetKey(c.url);
          if (!key) return c;
          const code = getKeyToCouponCode(key);
          if (!code) return c;
          const matched = await fetchOne(code);
          if (!matched) return c;
          return {
            ...c,
            rmsName: matched.name ?? undefined,
            rate: c.rate ?? matched.discountFactor ?? undefined,
            startDate: c.startDate ?? matched.startTime ?? undefined,
            endDate: c.endDate ?? matched.endTime ?? undefined,
          } as CouponDisplay;
        }),
      );
      if (!cancelled) setCoupons(results);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId, output.id]);

  if (coupons.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold mb-2">使用クーポン</h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {coupons.map((c, i) => (
          <li
            key={i}
            className="border border-stone-200 rounded bg-white p-3 text-sm"
          >
            <div className="font-medium text-stone-900">
              {c.rmsName ?? c.label}
            </div>
            {c.rmsName && c.rmsName !== c.label && (
              <div className="text-xs text-stone-500 mt-0.5">{c.label}</div>
            )}
            {(c.startDate || c.endDate) && (
              <div className="text-xs text-stone-500 mt-1">
                {c.startDate
                  ? new Date(c.startDate).toLocaleDateString("ja-JP")
                  : ""}
                {c.endDate
                  ? ` 〜 ${new Date(c.endDate).toLocaleDateString("ja-JP")}`
                  : ""}
              </div>
            )}
            {c.note && (
              <div className="text-xs text-stone-600 mt-1">{c.note}</div>
            )}
            <a
              href={c.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs mt-2 inline-block break-all"
              style={{ color: "var(--brand-accent)" }}
            >
              クーポンURL →
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
