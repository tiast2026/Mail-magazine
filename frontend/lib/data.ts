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

export function getTemplates(brandId: string): Template[] {
  return brandData[brandId]?.templates ?? [];
}

export function getTemplate(brandId: string, id: string): Template | undefined {
  return getTemplates(brandId).find((t) => t.id === id);
}

export function getOutputs(brandId: string): MailOutput[] {
  return (brandData[brandId]?.outputs ?? [])
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getOutput(brandId: string, id: string): MailOutput | undefined {
  return getOutputs(brandId).find((o) => o.id === id);
}

/** ブランド設定の色・ロゴ等をテンプレ HTML の {{COLOR_*}} などに流し込む */
export function applyBrandToHtml(html: string, brand: BrandConfig): string {
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
    "{{BRAND_LOGO_FULL}}": `${brand.logoText} ( ${brand.name === "NOAHL" ? "ノアル" : brand.name} )`,
    "{{URL_NEW_ARRIVALS}}": brand.fixedUrls.newArrivals ?? "",
    "{{URL_REVIEW}}": brand.fixedUrls.review ?? "",
    "{{URL_SALE}}": brand.fixedUrls.salePage ?? "",
  };
  let out = html;
  for (const [k, v] of Object.entries(replacements)) {
    out = out.split(k).join(v);
  }
  return out;
}
