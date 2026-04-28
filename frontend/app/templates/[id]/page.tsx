import Link from "next/link";
import { notFound } from "next/navigation";
import { getTemplate, getTemplates } from "@/lib/data";
import HtmlPreview from "@/components/HtmlPreview";
import CopyButton from "@/components/CopyButton";

export async function generateStaticParams() {
  return getTemplates().map((t) => ({ id: t.id }));
}

export const dynamicParams = false;

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = getTemplate(id);
  if (!template) notFound();

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
          <h2 className="text-lg font-semibold">プレビュー</h2>
          <CopyButton text={template.html} label="HTMLをコピー" />
        </div>
        <HtmlPreview html={template.html} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">HTML ソース</h2>
        <pre className="bg-stone-900 text-stone-100 text-xs rounded p-4 overflow-auto max-h-96">
          {template.html}
        </pre>
      </section>
    </div>
  );
}
