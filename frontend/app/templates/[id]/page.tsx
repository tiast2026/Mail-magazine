import { notFound } from "next/navigation";
import {
  getBrandConfig,
  getDefaultBrandId,
  getOutputs,
  getTemplate,
  getTemplates,
} from "@/lib/data";
import TemplateDetailContent from "@/components/TemplateDetailContent";

export async function generateStaticParams() {
  const brandId = getDefaultBrandId();
  return getTemplates(brandId).map((t) => ({ id: t.id }));
}

export const dynamicParams = false;

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const brandId = getDefaultBrandId();
  const brand = getBrandConfig(brandId)!;
  const template = getTemplate(brandId, id);
  if (!template) notFound();

  const outputsForTemplate = getOutputs(brandId).filter(
    (o) => o.templateId === id,
  );

  return (
    <TemplateDetailContent
      brandId={brandId}
      brand={brand}
      initialTemplate={template}
      outputs={outputsForTemplate}
    />
  );
}
