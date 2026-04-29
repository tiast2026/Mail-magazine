"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "mail-magazine-rakuten-rms";

type Credentials = {
  serviceSecret: string;
  licenseKey: string;
  shopUrl: string;
};

const initial: Credentials = {
  serviceSecret: "",
  licenseKey: "",
  shopUrl: "",
};

export default function SettingsForm() {
  const [creds, setCreds] = useState<Credentials>(initial);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setCreds({ ...initial, ...JSON.parse(stored) });
      } catch {}
    }
  }, []);

  function update<K extends keyof Credentials>(key: K, value: Credentials[K]) {
    setCreds((c) => ({ ...c, [key]: value }));
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
    setSavedAt(new Date().toLocaleTimeString("ja-JP"));
  }

  function clearAll() {
    if (!confirm("認証情報をブラウザから削除しますか？")) return;
    localStorage.removeItem(STORAGE_KEY);
    setCreds(initial);
    setSavedAt(null);
  }

  const json = JSON.stringify(
    {
      rakutenRms: {
        serviceSecret: creds.serviceSecret,
        licenseKey: creds.licenseKey,
      },
      shopUrl: creds.shopUrl,
    },
    null,
    2,
  );

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(json);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = json;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const ready = creds.serviceSecret && creds.licenseKey && creds.shopUrl;

  return (
    <div className="space-y-6">
      <section className="border border-stone-200 rounded bg-white p-5 space-y-4">
        <h2 className="font-semibold">楽天 RMS 認証情報</h2>

        <div>
          <label className="text-xs text-stone-600 block mb-1">
            serviceSecret（SP で始まる文字列）
          </label>
          <input
            type={showSecret ? "text" : "password"}
            value={creds.serviceSecret}
            onChange={(e) => update("serviceSecret", e.target.value)}
            placeholder="SP123456_xxxxxxxxxx"
            className="w-full text-sm border border-stone-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400 font-mono"
          />
        </div>

        <div>
          <label className="text-xs text-stone-600 block mb-1">
            licenseKey（SL で始まる文字列）
          </label>
          <input
            type={showSecret ? "text" : "password"}
            value={creds.licenseKey}
            onChange={(e) => update("licenseKey", e.target.value)}
            placeholder="SL123456_xxxxxxxxxx"
            className="w-full text-sm border border-stone-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400 font-mono"
          />
        </div>

        <div>
          <label className="text-xs text-stone-600 block mb-1">
            楽天ショップ URL（item.rakuten.co.jp/<b>ここ</b>/）
          </label>
          <input
            type="text"
            value={creds.shopUrl}
            onChange={(e) => update("shopUrl", e.target.value)}
            placeholder="noahl"
            className="w-full text-sm border border-stone-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-400 font-mono"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-stone-600">
          <input
            type="checkbox"
            checked={showSecret}
            onChange={(e) => setShowSecret(e.target.checked)}
          />
          シークレットを表示
        </label>

        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={save}
            className="text-sm bg-stone-800 text-white rounded px-4 py-2 hover:bg-stone-700"
          >
            ブラウザに保存
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="text-sm text-stone-500 hover:text-red-600"
          >
            削除
          </button>
          {savedAt && (
            <span className="text-xs text-emerald-700">
              保存しました ({savedAt})
            </span>
          )}
        </div>
      </section>

      <section className="border border-stone-200 rounded bg-white p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Claude Code に渡す JSON</h2>
          <button
            type="button"
            onClick={copyJson}
            disabled={!ready}
            className={`text-sm rounded px-4 py-2 transition ${
              !ready
                ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                : copied
                  ? "bg-emerald-600 text-white"
                  : "bg-stone-800 text-white hover:bg-stone-700"
            }`}
          >
            {copied ? "コピーしました" : "JSONとしてコピー"}
          </button>
        </div>
        <p className="text-xs text-stone-600">
          このJSONを Claude Code のチャットに貼って「この認証情報で品番〇〇のメルマガ作って」のように指示してください。
          認証情報はその場で使われ、リポジトリには保存されません。
        </p>
        <pre className="bg-stone-900 text-stone-100 text-xs rounded p-3 overflow-auto">
          {ready ? json : "（serviceSecret / licenseKey / shopUrl を入力してください）"}
        </pre>
      </section>
    </div>
  );
}
