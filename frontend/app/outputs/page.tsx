import { getDefaultBrandId, getOutputs } from "@/lib/data";
import OutputsListClient from "@/components/OutputsListClient";

export default function OutputsPage() {
  const brandId = getDefaultBrandId();
  const outputs = getOutputs(brandId);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold mb-1">配信メルマガ</h1>
        <p className="text-stone-600 text-sm">
          Claude Code が生成したメルマガの一覧です。プレビュー・HTMLコピー・実績入力ができます。
        </p>
      </section>

      <OutputsListClient initial={outputs} />
    </div>
  );
}
