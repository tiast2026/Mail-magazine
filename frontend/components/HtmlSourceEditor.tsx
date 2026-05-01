"use client";

import { useEffect, useRef, useState } from "react";
import { highlightHtml } from "@/lib/highlight-html";

/**
 * HTML ソース編集エディタ（行番号 + シンタックスハイライト）。
 * - 行番号付きの textarea
 * - 透明な textarea を highlighted <pre> に重ねる layered 方式
 * - Tab キーで2スペース挿入
 * - リアルタイムで onChange を通知（プレビューに反映）
 * - 保存ボタンで onSave 実行（⌘S/Ctrl+S）
 */
export default function HtmlSourceEditor({
  initial,
  onChange,
  onSave,
}: {
  initial: string;
  onChange: (html: string) => void;
  onSave: (html: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initial);
  const [savedValue, setSavedValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);

  const dirty = value !== savedValue;
  const lineCount = value.split("\n").length;

  useEffect(() => {
    onChange(value);
  }, [value, onChange]);

  // 親から渡される initial が変わったら同期（保存後など）
  useEffect(() => {
    setSavedValue(initial);
    setValue((cur) => (cur === savedValue ? initial : cur));
    // 編集中は上書きしない（dirty な内容を吹き飛ばさないため）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  // テキストエリアと pre / 行番号のスクロール同期
  function handleScroll(e: React.UIEvent<HTMLTextAreaElement>) {
    const top = e.currentTarget.scrollTop;
    const left = e.currentTarget.scrollLeft;
    if (lineNumRef.current) lineNumRef.current.scrollTop = top;
    if (preRef.current) {
      preRef.current.scrollTop = top;
      preRef.current.scrollLeft = left;
    }
  }

  // Tab → 2スペース、⌘S → 保存
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const ta = taRef.current;
    if (!ta) return;
    if (e.key === "Tab") {
      e.preventDefault();
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = value.substring(0, start) + "  " + value.substring(end);
      setValue(newValue);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    } else if (
      (e.key === "s" || e.key === "S") &&
      (e.metaKey || e.ctrlKey)
    ) {
      e.preventDefault();
      void save();
    }
  }

  async function save() {
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(value);
      setSavedValue(value);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    setValue(savedValue);
  }

  // ハイライト適用結果（メモ化はしない、入力ごとに計算）
  const highlighted = highlightHtml(value);

  return (
    <div className="border border-stone-700 rounded overflow-hidden bg-stone-900">
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-stone-800 text-xs">
        <div className="flex items-center gap-2 text-stone-400">
          <span className="font-medium">HTML ソース</span>
          {dirty ? (
            <span className="text-amber-400">● 未保存</span>
          ) : (
            <span className="text-emerald-500">✓ 保存済</span>
          )}
          <span className="text-stone-600">{lineCount} 行</span>
        </div>
        <div className="flex gap-2">
          {dirty && (
            <button
              onClick={discard}
              className="text-stone-400 hover:text-stone-200 px-2 py-0.5 rounded"
            >
              元に戻す
            </button>
          )}
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="bg-amber-500 hover:bg-amber-400 disabled:bg-stone-700 disabled:text-stone-500 text-stone-900 font-medium px-3 py-0.5 rounded"
          >
            {saving ? "保存中..." : "保存（⌘S）"}
          </button>
        </div>
      </header>

      {error && (
        <div className="px-3 py-1.5 bg-rose-900/30 text-rose-300 text-xs border-b border-rose-900/50">
          {error}
        </div>
      )}

      {/* ハイライト用カラー定義（CSS） */}
      <style>{HIGHLIGHT_CSS}</style>

      <div className="flex relative" style={{ height: 480 }}>
        {/* 行番号 */}
        <div
          ref={lineNumRef}
          aria-hidden
          className="select-none text-right pr-2 py-3 text-[12px] leading-[1.6] text-stone-600 bg-stone-950/50 border-r border-stone-800 overflow-hidden font-mono shrink-0"
          style={{ width: 48 }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* layered editor: pre (背景, ハイライト) + textarea (前面, 透明テキスト) */}
        <div className="relative flex-1 overflow-hidden">
          <pre
            ref={preRef}
            aria-hidden
            className="absolute inset-0 m-0 px-3 py-3 text-[12px] leading-[1.6] font-mono pointer-events-none whitespace-pre overflow-auto"
            style={{ tabSize: 2 }}
            dangerouslySetInnerHTML={{ __html: highlighted + "\n" }}
          />
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            spellCheck={false}
            className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-amber-300 text-[12px] leading-[1.6] font-mono resize-none outline-none px-3 py-3"
            style={{ tabSize: 2 }}
            wrap="off"
          />
        </div>
      </div>
    </div>
  );
}

const HIGHLIGHT_CSS = `
.hl-comment { color: #78716c; font-style: italic; }
.hl-bracket { color: #fb7185; }
.hl-tag { color: #fda4af; }
.hl-attr { color: #6ee7b7; }
.hl-equals { color: #a8a29e; }
.hl-string { color: #fcd34d; }
`;
