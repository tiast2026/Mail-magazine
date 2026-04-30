import { getDefaultBrandId, getOutputs } from "@/lib/data";
import ResultsClient from "@/components/ResultsClient";

export const dynamic = "force-static";

export default function ResultsPage() {
  const brandId = getDefaultBrandId();
  const outputs = getOutputs(brandId);
  return <ResultsClient initial={outputs} />;
}
