import Link from "next/link";
import {
  getBrandConfig,
  getDefaultBrandId,
  getOutputs,
  getTemplates,
} from "@/lib/data";
import EventBadge from "@/components/EventBadge";
import QuickStartCard from "@/components/QuickStartCard";
import InstructionsPanel from "@/components/InstructionsPanel";
import EventCalendar from "@/components/EventCalendar";

export default function Home() {
  const brandId = getDefaultBrandId();
  const brand = getBrandConfig(brandId);
  const templates = getTemplates(brandId);
  const outputs = getOutputs(brandId);

  const totalSent = outputs.reduce(
    (sum, o) => sum + (o.results?.sentCount ?? 0),
    0,
  );
  const totalSales = outputs.reduce(
    (sum, o) => sum + (o.results?.salesAmount ?? 0),
    0,
  );
  const sendsWithRates = outputs.filter((o) => o.results?.openRate != null);
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

      <QuickStartCard />

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-stone-900">
            楽天イベントカレンダー
          </h2>
          <span className="text-xs text-stone-500">
            告知解禁日以降に配信可能
          </span>
        </div>
        <EventCalendar />
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="登録テンプレート" value={`${templates.length}`} unit="件" />
        <Stat label="配信済みメルマガ" value={`${outputs.length}`} unit="件" />
        <Stat
          label="平均開封率"
          value={avgOpenRate != null ? avgOpenRate.toFixed(1) : "—"}
          unit={avgOpenRate != null ? "%" : ""}
        />
        <Stat
          label="累計売上"
          value={totalSales > 0 ? `${(totalSales / 10000).toFixed(1)}` : "—"}
          unit={totalSales > 0 ? "万円" : ""}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section>
            <SectionHeader title="最近の配信メルマガ" link="/outputs" />
            {outputs.length === 0 ? (
              <EmptyState
                text="まだ配信メルマガはありません"
                sub="↑ Quick Start のサンプル指示を Claude Code に貼ると最初のメルマガが作れます"
              />
            ) : (
              <ul className="card divide-y divide-stone-100">
                {outputs.slice(0, 5).map((o) => (
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
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px]"
                              style={{ backgroundColor: "var(--brand-primary)" }}
                            >
                              テンプレ {o.templateId}
                            </span>
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
                          <div className="text-xs text-right shrink-0">
                            <div className="text-stone-700 font-medium">
                              開封 {o.results.openRate.toFixed(1)}%
                            </div>
                            {o.results.salesAmount != null && (
                              <div
                                className="font-semibold mt-0.5"
                                style={{ color: "var(--brand-accent)" }}
                              >
                                ￥{o.results.salesAmount.toLocaleString()}
                              </div>
                            )}
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
            <SectionHeader title="テンプレート" link="/templates" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

        <aside className="lg:col-span-1">
          <InstructionsPanel />
        </aside>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="card p-4">
      <div className="text-[11px] text-stone-500 uppercase tracking-wide">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <div className="text-2xl font-semibold text-stone-900">{value}</div>
        <div className="text-xs text-stone-500">{unit}</div>
      </div>
    </div>
  );
}

function SectionHeader({ title, link }: { title: string; link: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-base font-semibold text-stone-900">{title}</h2>
      <Link href={link} className="text-xs text-stone-500 hover:text-stone-900">
        すべて見る →
      </Link>
    </div>
  );
}

function EmptyState({ text, sub }: { text: string; sub: string }) {
  return (
    <div className="card border-dashed p-10 text-center">
      <div className="text-stone-700 text-sm">{text}</div>
      <div className="text-xs text-stone-500 mt-2">{sub}</div>
    </div>
  );
}
