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
  return (brandData[brandId]?.outputs ?? [])
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getOutput(brandId: string, id: string): MailOutput | undefined {
  return getOutputs(brandId).find((o) => o.id === id);
}

