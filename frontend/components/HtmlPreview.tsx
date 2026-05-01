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
      `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>
        html,body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;overflow:hidden;}
        a{cursor:pointer;}
        #__preview-content{transform-origin:top left;}
      </style></head><body><div id="__preview-content">${html}</div></body></html>`,
    );
    doc.close();

    const fit = () => {
      const content = doc.getElementById("__preview-content");
      if (!content) return;
      const naturalWidth = content.scrollWidth;
      const containerWidth = iframe.clientWidth;
      if (containerWidth === 0 || naturalWidth === 0) return;
      // 自然幅 > 表示幅 のときだけ縮小（拡大はしない）
      const scale = naturalWidth > containerWidth ? containerWidth / naturalWidth : 1;
      content.style.transform = `scale(${scale})`;
      content.style.width = `${naturalWidth}px`;
      // body 自体のサイズも縮小後サイズに合わせる
      // → iframe 内に横スクロール/縦スクロールが出ないようにする
      const scaledH = content.scrollHeight * scale;
      doc.body.style.width = `${containerWidth}px`;
      doc.body.style.height = `${scaledH}px`;
      iframe.style.height = `${scaledH + 4}px`;
    };

    fit();
    const interval = setInterval(fit, 500);
    const onResize = () => fit();
    window.addEventListener("resize", onResize);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", onResize);
    };
  }, [html]);

  return (
    <div className="border border-stone-200 rounded bg-white overflow-hidden">
      <iframe
        ref={iframeRef}
        className="w-full block"
        scrolling="no"
        style={{ minHeight: 400 }}
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        title="メルマガプレビュー"
      />
    </div>
  );
}
