"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import type { Client, GeneratedNewsletter, DashboardStats } from "@/types";

export default function DashboardPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [newsletters, setNewsletters] = useState<GeneratedNewsletter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getClients()
      .then((data) => {
        setClients(data);
        if (data.length > 0) setSelectedClientId(data[0].id);
      })
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, []);

  const loadData = useCallback(async (clientId: number) => {
    try {
      const [s, n] = await Promise.all([
        api.getDashboardStats(clientId),
        api.getNewsletters({ client_id: clientId }),
      ]);
      setStats(s);
      setNewsletters(n.slice(0, 10));
    } catch {
      setStats(null);
      setNewsletters([]);
    }
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      loadData(selectedClientId);
    }
  }, [selectedClientId, loadData]);

  const downloadHtml = (html: string, filename: string) => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <select
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          value={selectedClientId ?? ""}
          onChange={(e) => setSelectedClientId(Number(e.target.value))}
        >
          <option value="" disabled>
            クライアントを選択
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">今月の生成数</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {stats?.generated_this_month ?? "—"}
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">未ダウンロード</p>
          <p className="mt-2 text-3xl font-bold text-orange-500">
            {stats?.pending_download ?? "—"}
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">商品数</p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {stats?.product_count ?? "—"}
          </p>
        </div>
      </div>

      {/* Recent Newsletters */}
      <div className="rounded-lg bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold">最近のメルマガ</h2>
          <Link
            href="/newsletters"
            className="text-sm text-blue-600 hover:underline"
          >
            すべて見る
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="px-6 py-3 font-medium">日付</th>
                <th className="px-6 py-3 font-medium">件名</th>
                <th className="px-6 py-3 font-medium">ステータス</th>
                <th className="px-6 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {newsletters.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
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
                    <td className="px-6 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          nl.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : nl.status === "exported"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {nl.status === "approved"
                          ? "承認済"
                          : nl.status === "exported"
                          ? "エクスポート済"
                          : "下書き"}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            downloadHtml(
                              nl.html_ec,
                              `ec_${nl.id}.html`
                            )
                          }
                          className="rounded bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"
                        >
                          自社ECダウンロード
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
                          楽天ダウンロード
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
