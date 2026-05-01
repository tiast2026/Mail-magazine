"use client";

import { useEffect, useRef } from "react";

export default function HtmlPreview({
  html,
  maxHeight,
  fitToViewport,
}: {
  html: string;
  /** 縦方向の最大高さ（px）。指定すると幅と高さの両方でフィットするよう縮小する */
  maxHeight?: number;
  /** true のとき window.innerHeight - 96px を maxHeight として使う */
  fitToViewport?: boolean;
}) {
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
      const naturalHeight = content.scrollHeight;
      const containerWidth = iframe.clientWidth;
      if (containerWidth === 0 || naturalWidth === 0) return;
      // 幅にフィット
      const widthScale =
        naturalWidth > containerWidth ? containerWidth / naturalWidth : 1;
      // 高さにフィット
      const effectiveMax =
        maxHeight ??
        (fitToViewport && typeof window !== "undefined"
          ? window.innerHeight - 96
          : 0);
      let heightScale = 1;
      if (effectiveMax > 0) {
        const scaledH = naturalHeight * widthScale;
        if (scaledH > effectiveMax) heightScale = effectiveMax / scaledH;
      }
      const scale = widthScale * heightScale;
      content.style.transform = `scale(${scale})`;
      content.style.width = `${naturalWidth}px`;
      const scaledHFinal = naturalHeight * scale;
      doc.body.style.width = `${containerWidth}px`;
      doc.body.style.height = `${scaledHFinal}px`;
      iframe.style.height = `${scaledHFinal + 4}px`;
    };

    fit();
    const interval = setInterval(fit, 500);
    const onResize = () => fit();
    window.addEventListener("resize", onResize);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", onResize);
    };
  }, [html, maxHeight, fitToViewport]);

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
