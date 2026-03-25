"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import type { Client, GeneratedNewsletter } from "@/types";

const STATUS_OPTIONS = [
  { value: "", label: "すべて" },
  { value: "draft", label: "下書き" },
  { value: "approved", label: "承認済" },
  { value: "exported", label: "エクスポート済" },
];

function statusLabel(status: string) {
  switch (status) {
    case "approved":
      return "承認済";
    case "exported":
      return "エクスポート済";
    default:
      return "下書き";
  }
}

function statusClass(status: string) {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-700";
    case "exported":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-yellow-100 text-yellow-700";
  }
}

export default function NewsletterListPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [newsletters, setNewsletters] = useState<GeneratedNewsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientFilter, setClientFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    api
      .getClients()
      .then(setClients)
      .catch(() => setClients([]));
  }, []);

  const loadNewsletters = useCallback(async () => {
    setLoading(true);
    try {
      const params: { client_id?: number; status?: string } = {};
      if (clientFilter) params.client_id = Number(clientFilter);
      if (statusFilter) params.status = statusFilter;
      const data = await api.getNewsletters(params);
      setNewsletters(data);
    } catch {
      setNewsletters([]);
    } finally {
      setLoading(false);
    }
  }, [clientFilter, statusFilter]);

  useEffect(() => {
    loadNewsletters();
  }, [loadNewsletters]);

  const downloadHtml = (html: string, filename: string) => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">メルマガ履歴</h1>
        <Link
          href="/newsletters/new"
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          新規生成
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
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
        <div className="flex rounded-lg border border-gray-200 bg-white p-1">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg bg-white shadow-sm">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="px-6 py-3 font-medium">日付</th>
                  <th className="px-6 py-3 font-medium">件名</th>
                  <th className="px-6 py-3 font-medium">クライアント</th>
                  <th className="px-6 py-3 font-medium">ステータス</th>
                  <th className="px-6 py-3 font-medium">アクション</th>
                </tr>
              </thead>
              <tbody>
                {newsletters.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-gray-400"
                    >
                      メルマガがありません
                    </td>
                  </tr>
                ) : (
                  newsletters.map((nl) => (
                    <tr
                      key={nl.id}
                      className="border-b border-gray-50 hover:bg-gray-50"
                    >
                      <td className="px-6 py-3 text-gray-600">
                        {formatDate(nl.created_at)}
                      </td>
                      <td className="px-6 py-3">
                        <Link
                          href={`/newsletters/${nl.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {nl.subject}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {clients.find((c) => c.id === nl.client_id)?.name ??
                          `ID: ${nl.client_id}`}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(nl.status)}`}
                        >
                          {statusLabel(nl.status)}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex gap-2">
                          <Link
                            href={`/newsletters/${nl.id}`}
                            className="rounded bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
                          >
                            プレビュー
                          </Link>
                          <button
                            onClick={() =>
                              downloadHtml(nl.html_ec, `ec_${nl.id}.html`)
                            }
                            className="rounded bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"
                          >
                            EC
                          </button>
                          <button
                            onClick={() =>
                              downloadHtml(
                                nl.html_rakuten,
                                `rakuten_${nl.id}.html`
                              )
                            }
                            className="rounded bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                          >
                            楽天
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
