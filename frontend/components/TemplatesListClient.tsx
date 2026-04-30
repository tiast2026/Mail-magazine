"use client";

import Link from "next/link";
import type { Template } from "@/lib/types";
import { useOptimisticTemplates } from "@/lib/optimistic";

export default function TemplatesListClient({
  initial,
}: {
  initial: Template[];
}) {
  const templates = useOptimisticTemplates(initial);

  return (
    <ul className="space-y-4">
      {templates.map((t) => (
        <li key={t.id} className="border border-stone-200 rounded bg-white p-5">
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
              className="shrink-0 text-sm text-white rounded px-4 py-2"
              style={{ backgroundColor: "var(--brand-primary)" }}
            >
              プレビュー
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
