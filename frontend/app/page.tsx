import Link from "next/link";
import {
  getBrandConfig,
  getDefaultBrandId,
  getOutputs,
  getTemplates,
} from "@/lib/data";
import DashboardOutputs from "@/components/DashboardOutputs";

export default function Home() {
  const brandId = getDefaultBrandId();
  const brand = getBrandConfig(brandId);
  const templates = getTemplates(brandId);
  const outputs = getOutputs(brandId);

  return (
    <div className="space-y-8">
      <section>
        <div
          className="text-xs uppercase tracking-widest mb-1"
          style={{ color: "var(--brand-accent)" }}
        >
          dashboard
        </div>
        <h1 className="text-3xl font-semibold text-stone-900">
          {brand?.name}
        </h1>
        <p className="text-stone-600 text-sm mt-2 max-w-2xl">
          メルマガテンプレート・配信メルマガ・実績の管理画面です。
          メルマガ生成は Claude Code に指示してください。
        </p>
      </section>

      <DashboardOutputs outputs={outputs} templatesCount={templates.length} />

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-stone-900">
            テンプレート
          </h2>
          <Link
            href="/templates"
            className="text-xs text-stone-500 hover:text-stone-900"
          >
            すべて見る →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((t) => (
            <Link
              key={t.id}
              href={`/templates/${t.id}/`}
              className="card card-hover p-4 block"
            >
              <div
                className="text-[10px] uppercase tracking-widest font-bold mb-2"
                style={{ color: "var(--brand-accent)" }}
              >
                テンプレ {t.id}
              </div>
              <div className="font-semibold text-stone-900">{t.name}</div>
              <p className="text-xs text-stone-600 mt-2 line-clamp-2">
                {t.description}
              </p>
              {t.useCases && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {t.useCases.slice(0, 2).map((u) => (
                    <span
                      key={u}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600"
                    >
                      {u}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
