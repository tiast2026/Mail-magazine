import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 楽天 RMS Coupon API（1.0 SOAP/XML）から発行中クーポンを取得して、
 * クエリパラメータで絞り込んで JSON で返す。
 *
 * 既存の RAKUTEN_<BRAND>_SERVICE_SECRET / LICENSE_KEY を流用。
 *
 * クエリパラメータ（すべて optional）:
 *   manageNumber : 対象商品の管理番号でフィルタ（pcRedirectUrl にこの品番が含まれるもの）
 *   from         : 開始日時 (ISO) — クーポン期間がこの日時以降にかかるものに絞る
 *   to           : 終了日時 (ISO) — クーポン期間がこの日時以前にかかるものに絞る
 *   minRate      : 最小割引率 (例: 30 → 30%以上)
 *   maxRate      : 最大割引率
 *   status       : 'active' | 'all' （デフォルト 'active'：現在期間にかかるもの）
 *   couponName   : クーポン名で部分一致
 *   hits         : 1ページあたり取得件数（最大 100、デフォルト 100）
 *   page         : ページ番号（1〜）
 */

type Coupon = {
  couponCode: string;
  name: string;
  caption?: string | null;
  startTime: string | null;
  endTime: string | null;
  discountFactor: number | null; // 割引値（％ or 円。discountType で判別）
  discountType: string | null; // 楽天独自コード
  itemType: string | null;
  pcGetUrl: string | null; // 取得ボタンに使う URL
  pcRedirectUrl: string | null; // 適用先商品ページ
  /** pcGetUrl の getkey クエリ。outputs.json 側との突合キー */
  getKey: string | null;
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

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function pickTag(block: string, tag: string): string | null {
  // <tag>...</tag> または <tag/> をマッチ
  const empty = new RegExp(`<${tag}\\s*/>`);
  if (empty.test(block)) return null;
  const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? decodeXmlEntities(m[1]).trim() : null;
}

function extractGetKey(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/[?&]getkey=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function parseCouponXml(xml: string): Coupon[] {
  const coupons: Coupon[] = [];
  // <coupon>...</coupon> ブロックを抽出（<coupons> 内の各エントリ）
  const re = /<coupon>([\s\S]*?)<\/coupon>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const b = m[1];
    const code = pickTag(b, "couponCode") ?? "";
    const factor = pickTag(b, "discountFactor");
    const pcGetUrl = pickTag(b, "pcGetUrl");
    coupons.push({
      couponCode: code,
      name: pickTag(b, "couponName") ?? "",
      caption: pickTag(b, "couponCaption"),
      startTime: pickTag(b, "couponStartDate"),
      endTime: pickTag(b, "couponEndDate"),
      discountFactor: factor ? Number(factor) : null,
      discountType: pickTag(b, "discountType"),
      itemType: pickTag(b, "itemType"),
      pcGetUrl,
      pcRedirectUrl: pickTag(b, "pcRedirectUrl"),
      getKey: extractGetKey(pcGetUrl),
    });
  }
  return coupons;
}

function originOk(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ brandId: string }> },
) {
  if (!originOk(req)) {
    return Response.json({ error: "Forbidden origin" }, { status: 403 });
  }
  const { brandId } = await params;
  const url = new URL(req.url);
  const q = url.searchParams;

  const filterManage = q.get("manageNumber");
  const from = parseDate(q.get("from"));
  const to = parseDate(q.get("to"));
  const minRate = q.get("minRate") ? Number(q.get("minRate")) : null;
  const maxRate = q.get("maxRate") ? Number(q.get("maxRate")) : null;
  const status = q.get("status") ?? "active";
  const couponNameQuery = q.get("couponName");
  const couponCodeQuery = q.get("couponCode");
  const hits = q.get("hits") ?? "100";
  const page = q.get("page") ?? "1";

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
    "ESA " + Buffer.from(`${serviceSecret}:${licenseKey}`).toString("base64");

  // 楽天 RMS Coupon API（1.0 系・XML 返却）
  const baseUrl =
    process.env.RAKUTEN_COUPON_API_URL ??
    "https://api.rms.rakuten.co.jp/es/1.0/coupon/search";

  const apiUrl = new URL(baseUrl);
  apiUrl.searchParams.set("hits", hits);
  apiUrl.searchParams.set("page", page);
  if (couponNameQuery) apiUrl.searchParams.set("couponName", couponNameQuery);
  if (couponCodeQuery) apiUrl.searchParams.set("couponCode", couponCodeQuery);

  let xmlBody: string;
  try {
    const res = await fetch(apiUrl.toString(), {
      headers: { Authorization: auth, Accept: "application/xml" },
      cache: "no-store",
    });
    xmlBody = await res.text();
    if (!res.ok) {
      return Response.json(
        {
          error: `楽天 RMS Coupon API エラー HTTP ${res.status}`,
          detail: xmlBody.slice(0, 1500),
          apiUrl: apiUrl.toString(),
        },
        { status: res.status },
      );
    }
  } catch (e) {
    return Response.json(
      { error: "クーポン取得失敗", detail: String(e) },
      { status: 500 },
    );
  }

  // 応答中の systemStatus / message チェック（OK 以外はエラー扱い）
  const sys = xmlBody.match(/<systemStatus>([^<]+)<\/systemStatus>/)?.[1];
  if (sys && sys !== "OK") {
    const msg = xmlBody.match(/<message>([\s\S]*?)<\/message>/)?.[1];
    return Response.json(
      {
        error: `楽天 RMS Coupon API systemStatus=${sys}`,
        message: msg,
        rawBody: xmlBody.slice(0, 1500),
      },
      { status: 502 },
    );
  }

  const allCount = Number(
    xmlBody.match(/<allCount>(\d+)<\/allCount>/)?.[1] ?? "0",
  );
  const coupons = parseCouponXml(xmlBody);

  // フィルタ
  const now = new Date();
  const filtered = coupons.filter((c) => {
    const st = parseDate(c.startTime);
    const et = parseDate(c.endTime);

    if (status === "active") {
      if (st && st > now) return false;
      if (et && et < now) return false;
    }
    if (from && et && et < from) return false;
    if (to && st && st > to) return false;
    if (minRate != null && (c.discountFactor ?? -1) < minRate) return false;
    if (maxRate != null && (c.discountFactor ?? Infinity) > maxRate) return false;
    if (filterManage) {
      // pcRedirectUrl に品番が含まれているかでフィルタ
      const pr = c.pcRedirectUrl ?? "";
      if (!pr.includes(`/${filterManage}/`) && !pr.includes(`/${filterManage}?`)) {
        return false;
      }
    }
    return true;
  });

  return Response.json({
    brandId,
    shopUrl,
    apiUrl: apiUrl.toString(),
    query: {
      manageNumber: filterManage,
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
      minRate,
      maxRate,
      status,
      couponName: couponNameQuery,
      hits,
      page,
    },
    allCount, // 全件数（hits を超えていても全部の件数）
    total: coupons.length, // このページで取得できた件数
    matched: filtered.length, // フィルタ後の件数
    coupons: filtered,
  });
}
