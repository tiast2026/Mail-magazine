"use client";

import { useEffect, useRef, useState } from "react";

/**
 * HTML ソース編集エディタ。
 * - 行番号付きの textarea
 * - Tab キーで2スペース挿入
 * - リアルタイムで onChange を通知（プレビューに反映）
 * - 保存ボタンで onSave 実行
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
  const lineNumRef = useRef<HTMLDivElement>(null);

  const dirty = value !== savedValue;
  const lineCount = value.split("\n").length;

  useEffect(() => {
    onChange(value);
  }, [value, onChange]);

  // initial が外部から変わったら同期
  useEffect(() => {
    setSavedValue(initial);
    setValue(initial);
  }, [initial]);

  // 行番号スクロール同期
  function handleScroll(e: React.UIEvent<HTMLTextAreaElement>) {
    if (lineNumRef.current) {
      lineNumRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  }

  // Tab キーで2スペース挿入
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const ta = taRef.current;
    if (!ta) return;
    if (e.key === "Tab") {
      e.preventDefault();
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = value.substring(0, start) + "  " + value.substring(end);
      setValue(newValue);
      // カーソル位置調整は次フレームで
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

      <div className="flex relative" style={{ height: 480 }}>
        <div
          ref={lineNumRef}
          aria-hidden
          className="select-none text-right pr-2 py-3 text-[11px] leading-[1.6] text-stone-600 bg-stone-950/50 border-r border-stone-800 overflow-hidden font-mono shrink-0"
          style={{ width: 48 }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          spellCheck={false}
          className="flex-1 bg-stone-900 text-stone-100 text-[11px] leading-[1.6] font-mono resize-none outline-none px-3 py-3 caret-amber-400"
          style={{ tabSize: 2 }}
          wrap="off"
        />
      </div>
    </div>
  );
}
