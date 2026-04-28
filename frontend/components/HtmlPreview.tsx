"use client";

import { useEffect, useRef } from "react";

export default function HtmlPreview({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(
      `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;font-family:Arial,Helvetica,sans-serif;}</style></head><body>${html}</body></html>`,
    );
    doc.close();
    const resize = () => {
      if (doc.body) {
        iframe.style.height = `${doc.body.scrollHeight + 20}px`;
      }
    };
    resize();
    const interval = setInterval(resize, 500);
    return () => clearInterval(interval);
  }, [html]);

  return (
    <div className="border border-stone-200 rounded bg-white overflow-hidden">
      <iframe
        ref={iframeRef}
        className="w-full"
        style={{ minHeight: 400 }}
        sandbox="allow-same-origin"
        title="メルマガプレビュー"
      />
    </div>
  );
}
