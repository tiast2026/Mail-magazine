import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 楽天 RMS Coupon API 経由で発行中クーポンを取得して、
 * クエリパラメータで絞り込んで返す。
 *
 * 既存の RAKUTEN_<BRAND>_SERVICE_SECRET / LICENSE_KEY / SHOP_URL を流用。
 *
 * クエリパラメータ（すべて optional）:
 *   manageNumber : 対象商品の管理番号でフィルタ（個別商品指定クーポンのみマッチ）
 *   from         : 開始日時 (ISO) — クーポン期間がこの日時以降にかかるものに絞る
 *   to           : 終了日時 (ISO) — クーポン期間がこの日時以前にかかるものに絞る
 *   minRate      : 最小割引率 (例: 30 → 30%以上)
 *   maxRate      : 最大割引率
 *   status       : 'active' | 'all' （デフォルト 'active'：今日含む期間のもの）
 */

type Coupon = {
  couponCode: string;
  name: string;
  startTime: string | null;
  endTime: string | null;
  discountRate: number | null;
  discountAmount: number | null;
  targetType: string | null;
  targetManageNumbers: string[];
  status: string | null;
  couponUrl: string | null;
};

function envPrefixFor(brandId: string): string {
  const sanitized = brandId.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  return `RAKUTEN_${sanitized}`;
}

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ brandId: string }> },
) {
  const { brandId } = await params;
  const url = new URL(req.url);
  const q = url.searchParams;

  const filterManage = q.get("manageNumber");
  const from = parseDate(q.get("from"));
  const to = parseDate(q.get("to"));
  const minRate = q.get("minRate") ? Number(q.get("minRate")) : null;
  const maxRate = q.get("maxRate") ? Number(q.get("maxRate")) : null;
  const status = q.get("status") ?? "active";

  const prefix = envPrefixFor(brandId);
  const serviceSecret =
    process.env[`${prefix}_SERVICE_SECRET`] ??
    process.env.RAKUTEN_SERVICE_SECRET;
  const licenseKey =
    process.env[`${prefix}_LICENSE_KEY`] ?? process.env.RAKUTEN_LICENSE_KEY;
  const shopUrl =
    process.env[`${prefix}_SHOP_URL`] ?? process.env.RAKUTEN_SHOP_URL ?? "";

  if (!serviceSecret || !licenseKey) {
    return Response.json(
      {
        error: `${brandId} の楽天RMS認証情報が設定されていません`,
        expectedVars: [
          `${prefix}_SERVICE_SECRET`,
          `${prefix}_LICENSE_KEY`,
          `${prefix}_SHOP_URL`,
        ],
      },
      { status: 500 },
    );
  }

  const auth =
    "ESA " +
    Buffer.from(`${serviceSecret}:${licenseKey}`).toString("base64");

  // 楽天 RMS Coupon API（v2 系）
  // 仕様の詳細は https://webservice.faq.rakuten.net/ 参照
  // エンドポイントが異なる場合は環境変数 RAKUTEN_COUPON_API_URL で上書き可能
  const apiUrl =
    process.env.RAKUTEN_COUPON_API_URL ??
    "https://api.rms.rakuten.co.jp/es/2.0/coupons/issue/search?hits=100";

  let upstream: unknown;
  try {
    const res = await fetch(apiUrl, {
      headers: { Authorization: auth, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      return Response.json(
        {
          error: `楽天 RMS Coupon API エラー HTTP ${res.status}`,
          detail: text.slice(0, 1000),
          hint: "エンドポイントが異なる場合は環境変数 RAKUTEN_COUPON_API_URL で上書きしてください",
        },
        { status: res.status },
      );
    }
    upstream = await res.json();
  } catch (e) {
    return Response.json(
      { error: "クーポン取得失敗", detail: String(e) },
      { status: 500 },
    );
  }

  // 楽天のレスポンスフォーマット差異を吸収
  // 想定: { coupons: [{ couponCode, couponName, startTime, endTime,
  //                    discountFactor: { unit, value }, target: { type, items: [{ manageNumber }] } }] }
  const rawList: Record<string, unknown>[] = (() => {
    const u = upstream as Record<string, unknown>;
    if (Array.isArray(u?.coupons)) return u.coupons as Record<string, unknown>[];
    if (Array.isArray(u?.couponList))
      return u.couponList as Record<string, unknown>[];
    if (Array.isArray(u?.results)) return u.results as Record<string, unknown>[];
    return [];
  })();

  const normalized: Coupon[] = rawList.map((c) => {
    const discountFactor = (c.discountFactor ?? c.discount) as
      | Record<string, unknown>
      | undefined;
    const isRate =
      discountFactor?.unit === "PERCENTAGE" ||
      discountFactor?.unit === "rate" ||
      discountFactor?.type === "rate";
    const value = Number(discountFactor?.value ?? discountFactor?.amount ?? 0);

    const target = (c.target ?? c.targetItems) as
      | Record<string, unknown>
      | undefined;
    const targetItems = (target?.items ?? c.items ?? []) as Record<
      string,
      unknown
    >[];
    const manageNumbers = targetItems
      .map((it) => String(it.manageNumber ?? it.itemId ?? "").trim())
      .filter(Boolean);

    const code = String(c.couponCode ?? c.code ?? c.couponId ?? "");
    return {
      couponCode: code,
      name: String(c.couponName ?? c.name ?? ""),
      startTime: (c.startTime ?? c.displayStartTime ?? null) as string | null,
      endTime: (c.endTime ?? c.displayEndTime ?? null) as string | null,
      discountRate: isRate ? value : null,
      discountAmount: !isRate ? value : null,
      targetType: (target?.type ?? c.targetType ?? null) as string | null,
      targetManageNumbers: manageNumbers,
      status: (c.status ?? c.state ?? null) as string | null,
      couponUrl: code
        ? `https://coupon.rakuten.co.jp/getCoupon?getkey=${encodeURIComponent(code)}&rt=`
        : null,
    };
  });

  // フィルタ
  const now = new Date();
  const filtered = normalized.filter((c) => {
    const st = parseDate(c.startTime);
    const et = parseDate(c.endTime);

    if (status === "active") {
      if (st && st > now) return false;
      if (et && et < now) return false;
    }
    if (from && et && et < from) return false;
    if (to && st && st > to) return false;
    if (minRate != null && (c.discountRate ?? -1) < minRate) return false;
    if (maxRate != null && (c.discountRate ?? Infinity) > maxRate) return false;
    if (filterManage) {
      // 対象商品リストに含まれていればマッチ。含まれていなければ「全品/カテゴリ等」と判断して除外
      if (
        c.targetManageNumbers.length === 0 ||
        !c.targetManageNumbers.includes(filterManage)
      ) {
        return false;
      }
    }
    return true;
  });

  return Response.json({
    brandId,
    shopUrl,
    query: {
      manageNumber: filterManage,
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
      minRate,
      maxRate,
      status,
    },
    total: normalized.length,
    matched: filtered.length,
    coupons: filtered,
  });
}
