import Link from "next/link";
import { notFound } from "next/navigation";
import {
  applyBrandToHtml,
  getBrandConfig,
  getDefaultBrandId,
  getOutput,
  getOutputs,
} from "@/lib/data";
import HtmlPreview from "@/components/HtmlPreview";
import CopyButton from "@/components/CopyButton";
import ResultsForm from "@/components/ResultsForm";

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

  const htmlWithBrand = applyBrandToHtml(output.html, brand);

  return (
    <div className="space-y-6">
      <div className="text-sm">
        <Link href="/outputs" className="text-stone-600 hover:text-stone-900">
          ← 配信メルマガ一覧へ
        </Link>
      </div>

      <section>
        <div className="text-xs text-stone-500">
          テンプレ {output.templateId} ・{" "}
          {new Date(output.createdAt).toLocaleString("ja-JP")} 生成
        </div>
        <h1 className="text-2xl font-semibold mt-1">{output.title}</h1>
        {output.tags && output.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {output.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-stone-100 text-stone-700 rounded-full px-3 py-1"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">使用商品</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {output.products.map((p, i) => (
            <li
              key={i}
              className="border border-stone-200 rounded bg-white p-3 flex gap-3 items-start"
            >
              {p.imageUrl && (
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="w-16 h-16 object-cover rounded shrink-0"
                />
              )}
              <div className="min-w-0 text-sm">
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium hover:underline block truncate"
                >
                  {p.name}
                </a>
                {p.manageNumber && (
                  <div className="text-xs text-stone-500 mt-0.5">
                    品番: {p.manageNumber}
                  </div>
                )}
                <div className="text-xs mt-1">
                  {p.regularPrice && (
                    <span className="text-stone-500 line-through mr-2">
                      {p.regularPrice}
                    </span>
                  )}
                  {p.salePrice && (
                    <span
                      className="font-semibold"
                      style={{ color: "var(--brand-accent)" }}
                    >
                      {p.salePrice}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">プレビュー</h2>
          <CopyButton text={htmlWithBrand} label="HTMLをコピー" />
        </div>
        <HtmlPreview html={htmlWithBrand} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">配信実績</h2>
        <ResultsForm outputId={output.id} initial={output.results ?? {}} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">HTML ソース</h2>
        <pre className="bg-stone-900 text-stone-100 text-xs rounded p-4 overflow-auto max-h-96">
          {htmlWithBrand}
        </pre>
      </section>
    </div>
  );
}
