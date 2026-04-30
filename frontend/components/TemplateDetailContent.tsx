"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { BrandConfig, MailOutput, Template } from "@/lib/types";
import { applyBrandToHtml } from "@/lib/brand";
import {
  useOptimisticOutputs,
  useOptimisticTemplate,
} from "@/lib/optimistic";
import HtmlPreview from "./HtmlPreview";
import CopyButton from "./CopyButton";
import TemplateEditor from "./TemplateEditor";
import EventBadge from "./EventBadge";

export default function TemplateDetailContent({
  brandId,
  brand,
  initialTemplate,
  outputs: initialOutputs = [],
}: {
  brandId: string;
  brand: BrandConfig;
  initialTemplate: Template;
  outputs?: MailOutput[];
}) {
  const router = useRouter();
  const { data: template, isDeleted } = useOptimisticTemplate(initialTemplate);
  const outputs = useOptimisticOutputs(initialOutputs);

  useEffect(() => {
    if (isDeleted) {
      router.push("/templates/");
    }
  }, [isDeleted, router]);

  if (isDeleted) {
    return (
      <div className="text-sm text-stone-500">
        このテンプレは削除されました。一覧へ戻ります...
      </div>
    );
  }

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
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">
            このテンプレで作ったメルマガ
          </h2>
          <span className="text-xs text-stone-500">{outputs.length} 件</span>
        </div>
        {outputs.length === 0 ? (
          <div className="card border-dashed p-6 text-center text-xs text-stone-500">
            このテンプレで作成されたメルマガはまだありません
          </div>
        ) : (
          <ul className="card divide-y divide-stone-100">
            {outputs.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/outputs/${o.id}/`}
                  className="block p-4 hover:bg-stone-50 transition"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-stone-900 truncate">
                        {o.title}
                      </div>
                      <div className="text-xs text-stone-500 mt-1 flex items-center gap-2 flex-wrap">
                        {o.event && <EventBadge event={o.event} />}
                        <span>
                          {new Date(
                            o.scheduledAt ?? o.createdAt,
                          ).toLocaleString("ja-JP", {
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                    {o.results?.openRate != null && (
                      <div className="text-xs text-right shrink-0 text-stone-700">
                        開封 {o.results.openRate.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">HTML ソース（ブランド変数あり）</h2>
        <pre className="bg-stone-900 text-stone-100 text-xs rounded p-4 overflow-auto max-h-96">
          {template.html}
        </pre>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">編集・削除</h2>
        <TemplateEditor brandId={brandId} brand={brand} template={template} />
      </section>
    </div>
  );
}
