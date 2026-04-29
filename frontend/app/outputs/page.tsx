import Link from "next/link";
import { getDefaultBrandId, getOutputs } from "@/lib/data";

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

      {outputs.length === 0 ? (
        <div className="border border-dashed border-stone-300 rounded p-10 text-center text-stone-500 text-sm bg-white">
          まだ配信メルマガはありません。
          <br />
          Claude Code に「品番ABCでセール告知メルマガ作って」と指示してください。
        </div>
      ) : (
        <ul className="divide-y divide-stone-200 border border-stone-200 rounded bg-white">
          {outputs.map((o) => (
            <li
              key={o.id}
              className="p-4 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <Link
                  href={`/outputs/${o.id}/`}
                  className="font-medium hover:underline block truncate"
                >
                  {o.title}
                </Link>
                <div className="text-xs text-stone-500 mt-1">
                  テンプレ {o.templateId} ・ 商品 {o.products.length} 点 ・{" "}
                  {new Date(o.createdAt).toLocaleString("ja-JP")}
                </div>
                {o.tags && o.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {o.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-stone-100 text-stone-700 rounded-full px-2 py-0.5"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="shrink-0 text-right text-xs">
                {o.results?.openRate != null ? (
                  <div className="space-y-0.5 text-stone-700">
                    <div>開封 {o.results.openRate.toFixed(1)}%</div>
                    {o.results.clickRate != null && (
                      <div>クリック {o.results.clickRate.toFixed(1)}%</div>
                    )}
                    {o.results.salesAmount != null && (
                      <div className="text-emerald-700 font-medium">
                        ￥{o.results.salesAmount.toLocaleString()}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-stone-400">実績未入力</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
