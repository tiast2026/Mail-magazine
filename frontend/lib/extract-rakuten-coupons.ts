import type { Coupon } from "@/lib/types";

/**
 * メルマガHTMLから楽天クーポン URL（`https://coupon.rakuten.co.jp/getCoupon?getkey=...`）を抽出する。
 * R-Mail 直配信メルマガなど coupons[] が空のエントリで、
 * HTML 本文から実際に紐付いていたクーポンを割り出すために使う。
 *
 * クーポン名（label）は固定で「楽天クーポン」とし、
 * 実際の名前は表示時に RMS API（既存の CouponsSection 内 enrich）で解決される。
 */
export function extractRakutenCoupons(html: string): Coupon[] {
  if (!html) return [];
  const re = /https:\/\/coupon\.rakuten\.co\.jp\/getCoupon\?getkey=[A-Za-z0-9_\-]+/g;
  const seen = new Set<string>();
  const coupons: Coupon[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const url = m[0];
    if (seen.has(url)) continue;
    seen.add(url);
    coupons.push({
      label: "楽天クーポン",
      url,
    });
  }
  return coupons;
}
