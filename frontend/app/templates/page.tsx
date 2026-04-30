import { getDefaultBrandId, getTemplates } from "@/lib/data";
import TemplatesListClient from "@/components/TemplatesListClient";

export default function TemplatesPage() {
  const brandId = getDefaultBrandId();
  const templates = getTemplates(brandId);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold mb-1">テンプレート</h1>
        <p className="text-stone-600 text-sm">
          現在登録されているメルマガテンプレートです。Claude Code はこれらの中から
          商品の特性・配信タイミングに合うものを提案します。
        </p>
      </section>

      <TemplatesListClient initial={templates} />

      <section className="border border-stone-200 rounded bg-stone-50 p-5 text-sm text-stone-600">
        <h3 className="font-semibold text-stone-800 mb-2">
          テンプレートを追加・修正したい場合
        </h3>
        <p>
          各テンプレ詳細ページの「編集・削除」ボタンから Web 上で編集できます。
          または Claude Code に「テンプレD を追加したい、HTML はこれ：…」と指示すると追加できます。
        </p>
      </section>
    </div>
  );
}
