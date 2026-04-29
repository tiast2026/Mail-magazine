import type { BrandConfig } from "./types";

/**
 * テンプレ HTML の {{COLOR_*}} などをブランド config の値に置換する。
 * クライアント / サーバー どちらからも使える純粋関数。
 */
export function applyBrandToHtml(html: string, brand: BrandConfig): string {
  const noahlAlias = brand.name === "NOAHL" ? "ノアル" : brand.name;
  const replacements: Record<string, string> = {
    "{{COLOR_PRIMARY}}": brand.colors.primary,
    "{{COLOR_ACCENT}}": brand.colors.accent,
    "{{COLOR_MUTED}}": brand.colors.muted,
    "{{COLOR_TEXT}}": brand.colors.text,
    "{{COLOR_SUBTEXT}}": brand.colors.subtext,
    "{{COLOR_PANEL}}": brand.colors.panel,
    "{{COLOR_BORDER}}": brand.colors.border,
    "{{COLOR_WHITE}}": brand.colors.white,
    "{{BRAND_LOGO}}": brand.logoText,
    "{{BRAND_TAGLINE}}": `- ${brand.tagline} -`,
    "{{BRAND_LOGO_FULL}}": `${brand.logoText} ( ${noahlAlias} )`,
    "{{URL_NEW_ARRIVALS}}": brand.fixedUrls?.newArrivals ?? "",
    "{{URL_REVIEW}}": brand.fixedUrls?.review ?? "",
    "{{URL_SALE}}": brand.fixedUrls?.salePage ?? "",
  };
  let out = html;
  for (const [k, v] of Object.entries(replacements)) {
    out = out.split(k).join(v);
  }
  return out;
}
