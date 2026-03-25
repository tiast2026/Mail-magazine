"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import type { Client, Template } from "@/types";

export default function TemplatesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientFilter, setClientFilter] = useState<string>("");

  useEffect(() => {
    api
      .getClients()
      .then(setClients)
      .catch(() => setClients([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .getTemplates(clientFilter ? Number(clientFilter) : undefined)
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, [clientFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">テンプレート</h1>
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">すべてのクライアント</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-lg bg-white shadow-sm">
          <p className="text-gray-400">テンプレートがありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Link
              key={t.id}
              href={`/templates/${t.id}`}
              className="group rounded-lg bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-3 flex h-40 items-center justify-center rounded-lg bg-gray-100 text-gray-400 group-hover:bg-gray-50">
                {t.thumbnail ? (
                  <img
                    src={t.thumbnail}
                    alt={t.name}
                    className="h-full w-full rounded-lg object-cover"
                  />
                ) : (
                  <span className="text-4xl">📄</span>
                )}
              </div>
              <h3 className="text-sm font-semibold">{t.name}</h3>
              <p className="mt-1 text-xs text-gray-500">
                {t.slots?.length ?? 0} スロット
              </p>
              {t.client_id && (
                <p className="mt-1 text-xs text-gray-400">
                  {clients.find((c) => c.id === t.client_id)?.name ?? ""}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
