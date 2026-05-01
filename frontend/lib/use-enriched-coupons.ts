"use client";

import { useEffect, useState } from "react";
import type { Coupon } from "@/lib/types";

export type EnrichedCoupon = Coupon & {
  /** RMS から取得したフル名（あればこちらを優先表示） */
  rmsName?: string;
  /** RMS の pcRedirectUrl（個別商品クーポンの場合、URL に品番が含まれる） */
  pcRedirectUrl?: string | null;
};

/** クーポンURLから getkey を抽出 */
function extractGetKey(url: string): string | null {
  const m = url.match(/[?&]getkey=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * getkey を couponCode に逆変換。
 * 楽天は couponCode の最初の2セグメントを入れ替えて base64 した文字列の `==` を `--` に置換。
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

type RmsCoupon = {
  couponCode?: string;
  name?: string;
  startTime?: string | null;
  endTime?: string | null;
  discountFactor?: number | null;
  pcRedirectUrl?: string | null;
};

/**
 * coupons 配列に対して RMS API でクーポン名・期間・対象商品URLを取得して enrich する。
 * 取得まで baseCoupons をそのまま返す。
 */
export function useEnrichedCoupons(
  baseCoupons: Coupon[],
  brandId: string,
  outputId: string,
): EnrichedCoupon[] {
  const [coupons, setCoupons] = useState<EnrichedCoupon[]>(baseCoupons);

  useEffect(() => {
    setCoupons(baseCoupons);
    if (baseCoupons.length === 0) return;
    let cancelled = false;
    (async () => {
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
        baseCoupons.map(async (c): Promise<EnrichedCoupon> => {
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
            pcRedirectUrl: matched.pcRedirectUrl ?? undefined,
          };
        }),
      );
      if (!cancelled) setCoupons(results);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId, outputId]);

  return coupons;
}

/**
 * 商品の管理番号を渡して、適用される可能性が高いクーポンを返す。
 * 優先度:
 *   1. coupon.pcRedirectUrl に品番が含まれる（個別商品指定クーポン）
 *   2. 商品の割引率（=（regular - sale）/ regular）が coupon.rate と一致（±2pt 許容）
 */
export function findApplicableCoupon(
  manageNumber: string | undefined,
  productDiscountPercent: number | null,
  coupons: EnrichedCoupon[],
): EnrichedCoupon | null {
  if (coupons.length === 0) return null;
  // 1. URL に品番が含まれる個別指定クーポン
  if (manageNumber) {
    const byUrl = coupons.find(
      (c) =>
        c.pcRedirectUrl &&
        (c.pcRedirectUrl.includes(`/${manageNumber}/`) ||
          c.pcRedirectUrl.includes(`/${manageNumber}?`)),
    );
    if (byUrl) return byUrl;
  }
  // 2. 割引率マッチ（±2pt）
  if (productDiscountPercent != null) {
    const byRate = coupons.find(
      (c) => c.rate != null && Math.abs(c.rate - productDiscountPercent) <= 2,
    );
    if (byRate) return byRate;
  }
  return null;
}
