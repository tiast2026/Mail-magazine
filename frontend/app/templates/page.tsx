import Link from "next/link";
import { getTemplates } from "@/lib/data";

export default function TemplatesPage() {
  const templates = getTemplates();

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold mb-1">テンプレート</h1>
        <p className="text-stone-600 text-sm">
          現在登録されているメルマガテンプレートです。Claude Code はこれらの中から
          商品の特性・配信タイミングに合うものを提案します。
        </p>
      </section>

      <ul className="space-y-4">
        {templates.map((t) => (
          <li
            key={t.id}
            className="border border-stone-200 rounded bg-white p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-stone-500">テンプレ {t.id}</div>
                <h2 className="text-lg font-semibold mt-1">{t.name}</h2>
                <p className="text-sm text-stone-600 mt-2">{t.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {t.useCases.map((u) => (
                    <span
                      key={u}
                      className="text-xs bg-stone-100 text-stone-700 rounded-full px-3 py-1"
                    >
                      {u}
                    </span>
                  ))}
                  <span className="text-xs bg-amber-50 text-amber-800 rounded-full px-3 py-1">
                    商品 {t.productSlots} 点
                  </span>
                </div>
              </div>
              <Link
                href={`/templates/${t.id}/`}
                className="shrink-0 text-sm bg-stone-800 text-white rounded px-4 py-2 hover:bg-stone-700"
              >
                プレビュー
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <section className="border border-stone-200 rounded bg-stone-50 p-5 text-sm text-stone-600">
        <h3 className="font-semibold text-stone-800 mb-2">
          テンプレートを追加・修正したい場合
        </h3>
        <p>
          Claude Code に「テンプレDを追加したい、HTMLはこれ：…」と指示すれば、
          <code className="bg-white border border-stone-200 rounded px-1.5 py-0.5 mx-1 text-xs">
            frontend/data/templates.json
          </code>
          に追記して反映します。
        </p>
      </section>
    </div>
  );
}
