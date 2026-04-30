import { notFound } from "next/navigation";
import {
  getBrandConfig,
  getDefaultBrandId,
  getOutput,
  getOutputs,
} from "@/lib/data";
import OutputDetailContent from "@/components/OutputDetailContent";

export async function generateStaticParams() {
  const brandId = getDefaultBrandId();
  return getOutputs(brandId).map((o) => ({ id: o.id }));
}

export const dynamicParams = false;

export default async function OutputDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const brandId = getDefaultBrandId();
  const brand = getBrandConfig(brandId)!;
  const output = getOutput(brandId, id);
  if (!output) notFound();

  return (
    <OutputDetailContent
      brandId={brandId}
      brand={brand}
      initialOutput={output}
    />
  );
}
