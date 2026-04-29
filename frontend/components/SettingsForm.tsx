"use client";

import { useEffect, useState } from "react";

type ApiTestResult =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ok"; manageNumber: string; name: string | null; mainImage: string | null }
  | { state: "error"; status: number | null; message: string };

export default function SettingsForm() {
  const [manageNumber, setManageNumber] = useState("");
  const [result, setResult] = useState<ApiTestResult>({ state: "idle" });
  const [credsConfigured, setCredsConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    // 設定状態を確認するため、ダミー品番でAPIを叩いてみる
    fetch("/api/rakuten/__check__/")
      .then(async (r) => {
        if (r.status === 500) {
          const data = await r.json();
          setCredsConfigured(!String(data.error ?? "").includes("認証情報が設定されていません"));
        } else {
          setCredsConfigured(true);
        }
      })
      .catch(() => setCredsConfigured(false));
  }, []);

  async function testFetch() {
    if (!manageNumber.trim()) return;
    setResult({ state: "loading" });
    try {
      const res = await fetch(`/api/rakuten/${encodeURIComponent(manageNumber.trim())}/`);
      const data = await res.json();
      if (!res.ok) {
        setResult({
          state: "error",
          status: res.status,
          message: data.error ?? "不明なエラー",
        });
        return;
      }
      setResult({
        state: "ok",
        manageNumber: data.manageNumber,
        name: data.name,
        mainImage: data.mainImage,
      });
    } catch (e) {
      setResult({ state: "error", status: null, message: String(e) });
    }
  }

  return (
    <div className="space-y-6">
      <section className="card p-5 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <span>楽天 RMS API 設定状況</span>
          {credsConfigured === true && (
            <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
              ✓ 設定済み
            </span>
          )}
          {credsConfigured === false && (
            <span className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5">
              未設定
            </span>
          )}
        </h2>
        <p className="text-sm text-stone-600">
          楽天 RMS の認証情報（serviceSecret / licenseKey）は <b>Vercel の環境変数</b> で管理しています。
          チームメンバー全員が共通で使え、ブラウザに認証情報を保存する必要はありません。
        </p>

        <div className="bg-stone-50 border border-stone-200 rounded p-3 text-xs text-stone-700 space-y-2">
          <div className="font-semibold">設定方法（管理者向け）:</div>
          <ol className="list-decimal list-inside space-y-1">
            <li>Vercel ダッシュボード → mail-magazine プロジェクト → Settings → Environment Variables</li>
            <li>
              次の3つの環境変数を追加：
              <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
                <li>
                  <code className="bg-white border rounded px-1">RAKUTEN_SERVICE_SECRET</code>
                </li>
                <li>
                  <code className="bg-white border rounded px-1">RAKUTEN_LICENSE_KEY</code>
                </li>
                <li>
                  <code className="bg-white border rounded px-1">RAKUTEN_SHOP_URL</code>（例: noahl）
                </li>
              </ul>
            </li>
            <li>Save → Vercel が自動再デプロイ</li>
          </ol>
        </div>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">商品取得テスト</h2>
        <p className="text-xs text-stone-600">
          品番を入力すると、API 経由で楽天 RMS から商品情報を取得します。
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={manageNumber}
            onChange={(e) => setManageNumber(e.target.value)}
            placeholder="品番（例: nlwp315-2505）"
            className="flex-1 text-sm border border-stone-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400 font-mono"
          />
          <button
            type="button"
            onClick={testFetch}
            disabled={!manageNumber.trim() || result.state === "loading"}
            className="text-sm rounded px-4 py-2 text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            {result.state === "loading" ? "取得中..." : "取得"}
          </button>
        </div>

        {result.state === "ok" && (
          <div className="border border-emerald-200 bg-emerald-50 rounded p-3 text-sm">
            <div className="text-xs text-emerald-700 mb-2">✓ 取得成功</div>
            <div className="flex gap-3 items-start">
              {result.mainImage && (
                <img
                  src={result.mainImage}
                  alt={result.name ?? ""}
                  className="w-20 h-20 object-cover rounded"
                />
              )}
              <div className="text-sm">
                <div className="text-xs text-stone-500">{result.manageNumber}</div>
                <div className="font-medium mt-0.5">{result.name}</div>
              </div>
            </div>
          </div>
        )}

        {result.state === "error" && (
          <div className="border border-rose-200 bg-rose-50 rounded p-3 text-sm text-rose-800">
            <div className="text-xs font-semibold mb-1">
              エラー {result.status ? `(${result.status})` : ""}
            </div>
            <div className="text-xs">{result.message}</div>
          </div>
        )}
      </section>

      <section className="card p-5 text-xs text-stone-600">
        <h3 className="font-semibold text-stone-800 mb-2 text-sm">Claude Code 経由での生成</h3>
        <p>
          ブラウザでの認証情報入力は不要になりました。Claude Code に「品番〇〇 でメルマガ作って」と
          指示するだけで、内部で API 経由で商品情報を取得し、テンプレに流し込みます。
        </p>
      </section>
    </div>
  );
}
