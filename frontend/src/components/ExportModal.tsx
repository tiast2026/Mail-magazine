"use client";

import { useState, useRef, useEffect } from "react";

interface ExportModalProps {
  html: string;
  onClose: () => void;
}

export default function ExportModal({ html, onClose }: ExportModalProps) {
  const [tab, setTab] = useState<"code" | "preview">("code");
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (tab === "preview" && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
    }
  }, [tab, html]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      if (textareaRef.current) {
        textareaRef.current.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleDownload = () => {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "newsletter.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex h-[80vh] w-[800px] max-w-[90vw] flex-col rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">HTML出力</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setTab("code")}
            className={`mr-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === "code"
                ? "border-b-2 border-[#8c7b6b] text-[#625142]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            HTMLコード
          </button>
          <button
            onClick={() => setTab("preview")}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === "preview"
                ? "border-b-2 border-[#8c7b6b] text-[#625142]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            プレビュー
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          {tab === "code" ? (
            <textarea
              ref={textareaRef}
              readOnly
              value={html}
              className="h-full w-full resize-none rounded-lg border border-gray-300 bg-gray-50 p-4 font-mono text-xs leading-relaxed text-gray-700 focus:outline-none"
            />
          ) : (
            <iframe
              ref={iframeRef}
              className="h-full w-full rounded-lg border border-gray-300"
              title="プレビュー"
              sandbox="allow-same-origin"
            />
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            onClick={handleDownload}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            ダウンロード
          </button>
          <button
            onClick={handleCopy}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: copied ? "#22c55e" : "#8c7b6b" }}
          >
            {copied ? "コピーしました!" : "コピー"}
          </button>
        </div>
      </div>
    </div>
  );
}
