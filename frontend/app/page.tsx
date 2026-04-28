import Link from "next/link";
import { getOutputs, getTemplates } from "@/lib/data";

export default function Home() {
  const templates = getTemplates();
  const outputs = getOutputs();

  const totalSent = outputs.reduce(
    (sum, o) => sum + (o.results?.sentCount ?? 0),
    0,
  );
  const totalSales = outputs.reduce(
    (sum, o) => sum + (o.results?.salesAmount ?? 0),
    0,
  );
  const sendsWithRates = outputs.filter(
    (o) => o.results?.openRate != null,
  );
  const avgOpenRate =
    sendsWithRates.length > 0
      ? sendsWithRates.reduce(
          (sum, o) => sum + (o.results?.openRate ?? 0),
          0,
        ) / sendsWithRates.length
      : null;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold mb-1">ダッシュボード</h1>
        <p className="text-stone-600 text-sm">
          メルマガテンプレート・配信メルマガ・実績の管理画面です。
          メルマガ生成は Claude Code に「品番ABCでセール告知作って」と指示してください。
        </p>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="登録テンプレート" value={`${templates.length} 件`} />
        <Stat label="配信済みメルマガ" value={`${outputs.length} 件`} />
        <Stat
          label="平均開封率"
          value={avgOpenRate != null ? `${avgOpenRate.toFixed(1)}%` : "—"}
        />
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Stat label="累計配信数" value={`${totalSent.toLocaleString()} 通`} />
        <Stat
          label="累計売上"
          value={`￥${totalSales.toLocaleString()}`}
        />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">最近の配信メルマガ</h2>
          <Link
            href="/outputs"
            className="text-sm text-stone-600 hover:text-stone-900"
          >
            すべて見る →
          </Link>
        </div>
        {outputs.length === 0 ? (
          <div className="border border-dashed border-stone-300 rounded p-6 text-center text-stone-500 text-sm">
            まだ配信メルマガはありません。Claude Code で生成してください。
          </div>
        ) : (
          <ul className="divide-y divide-stone-200 border border-stone-200 rounded bg-white">
            {outputs.slice(0, 5).map((o) => (
              <li key={o.id} className="p-4 flex items-center justify-between">
                <div>
                  <Link
                    href={`/outputs/${o.id}/`}
                    className="font-medium hover:underline"
                  >
                    {o.title}
                  </Link>
                  <div className="text-xs text-stone-500 mt-1">
                    テンプレ {o.templateId} ・{" "}
                    {new Date(o.createdAt).toLocaleString("ja-JP")}
                  </div>
                </div>
                {o.results?.openRate != null && (
                  <div className="text-sm text-stone-600">
                    開封 {o.results.openRate.toFixed(1)}%
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">テンプレート一覧</h2>
          <Link
            href="/templates"
            className="text-sm text-stone-600 hover:text-stone-900"
          >
            詳しく見る →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {templates.map((t) => (
            <Link
              key={t.id}
              href={`/templates/${t.id}/`}
              className="border border-stone-200 rounded bg-white p-4 hover:shadow-sm transition"
            >
              <div className="text-xs text-stone-500">テンプレ {t.id}</div>
              <div className="font-medium mt-1">{t.name}</div>
              <div className="text-xs text-stone-600 mt-2 line-clamp-3">
                {t.description}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-stone-200 rounded bg-white p-4">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}
