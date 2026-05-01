import brandsIndex from "@/data/brands.json";
import noahlConfig from "@/data/brands/noahl/config.json";
import noahlTemplates from "@/data/brands/noahl/templates.json";
import noahlOutputs from "@/data/brands/noahl/outputs.json";
import type {
  BrandConfig,
  BrandSummary,
  MailOutput,
  Template,
} from "./types";
import { extractRakutenProducts } from "./extract-rakuten-products";
import { extractRakutenCoupons } from "./extract-rakuten-coupons";

export { applyBrandToHtml } from "./brand";

const brandData: Record<
  string,
  { config: BrandConfig; templates: Template[]; outputs: MailOutput[] }
> = {
  noahl: {
    config: noahlConfig as BrandConfig,
    templates: noahlTemplates as unknown as Template[],
    outputs: noahlOutputs as unknown as MailOutput[],
  },
};

export function getBrandList(): BrandSummary[] {
  return brandsIndex.brands as BrandSummary[];
}

export function getDefaultBrandId(): string {
  return (
    getBrandList().find((b) => b.default)?.id ?? getBrandList()[0]?.id ?? "noahl"
  );
}

export function getBrandConfig(brandId: string): BrandConfig | undefined {
  return brandData[brandId]?.config;
}

/** すべての登録ブランドの config を返す（settings 画面の編集 UI 用） */
export function getAllBrandConfigs(): Record<string, BrandConfig> {
  const out: Record<string, BrandConfig> = {};
  for (const [id, data] of Object.entries(brandData)) {
    out[id] = data.config;
  }
  return out;
}

export function getTemplates(brandId: string): Template[] {
  return brandData[brandId]?.templates ?? [];
}

export function getTemplate(brandId: string, id: string): Template | undefined {
  return getTemplates(brandId).find((t) => t.id === id);
}

export function getOutputs(brandId: string): MailOutput[] {
  const shop = brandData[brandId]?.config.rakutenShopUrl;
  return (brandData[brandId]?.outputs ?? [])
    .slice()
    .sort((a, b) => deliveryKey(b).localeCompare(deliveryKey(a)))
    .map((o) => enrichWithExtractedProducts(o, shop))
    .map((o) => enrichWithExtractedCoupons(o));
}

/**
 * 並び替えキー: 実配信時刻 > 配信予定 > 作成日 の優先順
 * 新しい配信日のメルマガを一覧上部に出すため。
 */
function deliveryKey(o: MailOutput): string {
  return o.results?.rakuten?.sentStartAt ?? o.sentAt ?? o.scheduledAt ?? o.createdAt;
}

export function getOutput(brandId: string, id: string): MailOutput | undefined {
  return getOutputs(brandId).find((o) => o.id === id);
}

/**
 * products[] が空のエントリ（R-Mail 直配信など）について、
 * HTML 本文から商品を抽出して埋める。
 */
function enrichWithExtractedProducts(
  output: MailOutput,
  shopUrl: string | undefined,
): MailOutput {
  if (output.products.length > 0) return output;
  if (!shopUrl || !output.html) return output;
  const extracted = extractRakutenProducts(output.html, shopUrl);
  if (extracted.length === 0) return output;
  return { ...output, products: extracted };
}

/**
 * coupons[] が空のエントリ（R-Mail 直配信など）について、
 * HTML 本文からクーポン URL を抽出して埋める。
 * クーポン名は表示時に RMS API（CouponsSection 内）で解決される。
 */
function enrichWithExtractedCoupons(output: MailOutput): MailOutput {
  if (output.coupons && output.coupons.length > 0) return output;
  // 旧形式 vars.COUPON_URL_* も既存値とみなし、二重抽出は避ける
  const vars = (output.variables ?? {}) as Record<string, string>;
  const hasLegacyCoupon = Object.entries(vars).some(
    ([k, v]) => /^COUPON_URL_/.test(k) && v,
  );
  if (hasLegacyCoupon) return output;
  if (!output.html) return output;
  const extracted = extractRakutenCoupons(output.html);
  if (extracted.length === 0) return output;
  return { ...output, coupons: extracted };
}

