import Link from "next/link";
import { notFound } from "next/navigation";
import {
  applyBrandToHtml,
  getBrandConfig,
  getDefaultBrandId,
  getTemplate,
  getTemplates,
} from "@/lib/data";
import HtmlPreview from "@/components/HtmlPreview";
import CopyButton from "@/components/CopyButton";

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

  const htmlWithBrand = applyBrandToHtml(template.html, brand);

  return (
    <div className="space-y-6">
      <div className="text-sm">
        <Link href="/templates" className="text-stone-600 hover:text-stone-900">
          ← テンプレート一覧へ
        </Link>
      </div>

      <section>
        <div className="text-xs text-stone-500">テンプレ {template.id}</div>
        <h1 className="text-2xl font-semibold mt-1">{template.name}</h1>
        <p className="text-stone-600 text-sm mt-2">{template.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {template.useCases.map((u) => (
            <span
              key={u}
              className="text-xs bg-stone-100 text-stone-700 rounded-full px-3 py-1"
            >
              {u}
            </span>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">プレビュー（ブランド色適用済み）</h2>
          <CopyButton text={htmlWithBrand} label="HTMLをコピー" />
        </div>
        <HtmlPreview html={htmlWithBrand} />
      </section>

      {template.requiredImages && template.requiredImages.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">必要な画像</h2>
          <ul className="space-y-2">
            {template.requiredImages.map((img) => (
              <li
                key={img.key}
                className="border border-stone-200 rounded bg-white p-3 text-sm"
              >
                <div className="font-medium">
                  {img.label}{" "}
                  <code className="text-xs bg-stone-100 rounded px-1">
                    {img.key}
                  </code>
                </div>
                <div className="text-xs text-stone-600 mt-1">
                  {img.description}
                </div>
                {img.recommended && (
                  <div className="text-xs text-stone-500 mt-1">
                    推奨: {img.recommended}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {template.bestFor && template.bestFor.length > 0 && (
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-stone-200 rounded bg-white p-4">
            <h3 className="text-sm font-semibold mb-2 text-emerald-700">
              ✓ こんな時に使う
            </h3>
            <ul className="text-xs text-stone-700 space-y-1 list-disc list-inside">
              {template.bestFor.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
          {template.notRecommendedFor && (
            <div className="border border-stone-200 rounded bg-white p-4">
              <h3 className="text-sm font-semibold mb-2 text-rose-700">
                ✗ 不向きなシーン
              </h3>
              <ul className="text-xs text-stone-700 space-y-1 list-disc list-inside">
                {template.notRecommendedFor.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-2">HTML ソース（ブランド変数あり）</h2>
        <pre className="bg-stone-900 text-stone-100 text-xs rounded p-4 overflow-auto max-h-96">
          {template.html}
        </pre>
      </section>
    </div>
  );
}
