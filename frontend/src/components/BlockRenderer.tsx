"use client";

import type { Block } from "@/lib/blocks";

interface ProductSlot {
  imageUrl: string;
  linkUrl: string;
  altText: string;
}

function PlaceholderImage({
  width = "100%",
  height = "200px",
  label = "",
}: {
  width?: string;
  height?: string;
  label?: string;
}) {
  return (
    <div
      style={{ width, height }}
      className="flex flex-col items-center justify-center rounded bg-gray-100 text-gray-400"
    >
      <svg
        className="mb-1 h-8 w-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
      {label && <span className="text-xs">{label}</span>}
    </div>
  );
}

function HeaderBlock({ props }: { props: Record<string, unknown> }) {
  return (
    <div className="bg-white py-6 text-center">
      <div className="text-lg tracking-widest" style={{ color: "#8c7b6b" }}>
        {String(props.brandName || "ＮＯＡＨＬ")}
      </div>
      <div className="mt-1 text-xs tracking-wide" style={{ color: "#b5a595" }}>
        {String(props.subtitle || "ノアル / レディースファッション")}
      </div>
    </div>
  );
}

function BannerBlock({ props }: { props: Record<string, unknown> }) {
  const imageUrl = String(props.imageUrl || "");
  if (imageUrl) {
    return (
      <div className="w-full">
        <img
          src={imageUrl}
          alt={String(props.altText || "")}
          className="w-full"
        />
      </div>
    );
  }
  return (
    <PlaceholderImage
      height="180px"
      label={String(props.altText || "バナー画像")}
    />
  );
}

function MessageBlock({ props }: { props: Record<string, unknown> }) {
  const bgColor = String(props.bgColor || "#f7f4f1");
  return (
    <div
      className="px-4 py-7 text-center"
      style={{ backgroundColor: bgColor }}
    >
      <div className="text-sm" style={{ color: "#8c7b6b" }}>
        {String(props.subtitle || "")}
      </div>
      <div className="mt-3 text-lg font-bold" style={{ color: "#625142" }}>
        {String(props.title || "")}
      </div>
      <div
        className="mt-3 whitespace-pre-line text-sm"
        style={{ color: "#a89585" }}
      >
        {String(props.description || "")}
      </div>
    </div>
  );
}

function ProductSingleBlock({ props }: { props: Record<string, unknown> }) {
  const imageUrl = String(props.imageUrl || "");
  const rank = String(props.rank || "");
  return (
    <div className="py-4 text-center">
      {rank && (
        <div
          className="mb-2 text-2xl font-bold"
          style={{ color: "#c4694a" }}
        >
          No.{rank}
        </div>
      )}
      <div className="mx-auto w-[85%]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={String(props.productName || "")}
            className="w-full"
          />
        ) : (
          <PlaceholderImage height="280px" label="商品画像" />
        )}
      </div>
      <div
        className="mt-3 text-base font-bold"
        style={{ color: "#625142" }}
      >
        {String(props.productName || "商品名")}
      </div>
      <div className="mt-1">
        {String(props.originalPrice || "") !== "" && (
          <span
            className="text-sm line-through"
            style={{ color: "#b5a595" }}
          >
            {String(props.originalPrice)}
          </span>
        )}
        {String(props.salePrice || "") !== "" && (
          <span
            className="ml-2 text-base font-bold"
            style={{ color: "#c4694a" }}
          >
            {String(props.salePrice)}
          </span>
        )}
      </div>
      <div className="mx-auto mt-4 w-[80%]">
        <div
          className="rounded py-3 text-center text-sm font-bold text-white"
          style={{ backgroundColor: "#8c7b6b" }}
        >
          {String(props.buttonText || "商品を見る →")}
        </div>
      </div>
    </div>
  );
}

function ProductGridBlock({ props }: { props: Record<string, unknown> }) {
  const products = (props.products as ProductSlot[]) || [];
  const columns = Number(props.columns || 2);
  const rows = Number(props.rows || 1);
  const totalSlots = columns * rows;

  const gridRows: ProductSlot[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: ProductSlot[] = [];
    for (let c = 0; c < columns; c++) {
      const idx = r * columns + c;
      row.push(
        idx < products.length
          ? products[idx]
          : { imageUrl: "", linkUrl: "", altText: `商品${idx + 1}` }
      );
    }
    gridRows.push(row);
  }

  return (
    <div className="mx-auto w-[90%] py-2">
      {gridRows.map((row, ri) => (
        <div key={ri} className="mb-2 flex gap-2">
          {row.map((p, ci) => (
            <div key={ci} className="flex-1">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.altText} className="w-full" />
              ) : (
                <PlaceholderImage
                  height={totalSlots > 2 ? "140px" : "160px"}
                  label={p.altText}
                />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function CtaButtonBlock({ props }: { props: Record<string, unknown> }) {
  const bgColor = String(props.bgColor || "#8c7b6b");
  return (
    <div className="py-5 text-center">
      <div className="mx-auto w-[80%]">
        <div
          className="rounded py-4 text-center text-sm font-bold text-white"
          style={{ backgroundColor: bgColor }}
        >
          {String(props.text || "詳しくはこちら →")}
        </div>
      </div>
    </div>
  );
}

function CouponButtonBlock({ props }: { props: Record<string, unknown> }) {
  return (
    <div className="py-5 text-center">
      <div className="mx-auto w-[80%]">
        <div
          className="rounded py-4 text-center text-sm font-bold text-white"
          style={{ backgroundColor: "#c4694a" }}
        >
          {String(props.text || "クーポンを獲得する →")}
        </div>
      </div>
    </div>
  );
}

function DividerBlock() {
  return (
    <div className="mx-auto w-[90%] py-4">
      <div style={{ borderTop: "1px solid #e8e2db" }} />
    </div>
  );
}

function TextLinkBlock({ props }: { props: Record<string, unknown> }) {
  return (
    <div className="py-4 text-center">
      <span className="text-sm font-bold" style={{ color: "#8c7b6b" }}>
        {String(props.text || "テキストリンク")}
      </span>
    </div>
  );
}

function FooterBlock() {
  return (
    <div>
      <div
        className="px-4 py-6 text-center"
        style={{ backgroundColor: "#f7f4f1" }}
      >
        <div className="text-sm font-bold" style={{ color: "#8c7b6b" }}>
          ▽ NOAHLの新作をチェック ▽
        </div>
        <div className="mt-3 text-sm" style={{ color: "#625142" }}>
          新作一覧を見る →
        </div>
        <div className="mt-3 text-xs" style={{ color: "#b5a595" }}>
          ──────────────
        </div>
        <div className="mt-3 text-xs" style={{ color: "#a89585" }}>
          レビュー投稿でプレゼント♪ 詳しくはこちら →
        </div>
      </div>
      <div className="py-5 text-center">
        <span
          className="text-xs tracking-widest"
          style={{ color: "#b5a595" }}
        >
          ＮＯＡＨＬ ( ノアル )
        </span>
      </div>
    </div>
  );
}

export default function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case "header":
      return <HeaderBlock props={block.props} />;
    case "banner":
      return <BannerBlock props={block.props} />;
    case "message":
      return <MessageBlock props={block.props} />;
    case "productSingle":
      return <ProductSingleBlock props={block.props} />;
    case "productGrid":
      return <ProductGridBlock props={block.props} />;
    case "ctaButton":
      return <CtaButtonBlock props={block.props} />;
    case "couponButton":
      return <CouponButtonBlock props={block.props} />;
    case "divider":
      return <DividerBlock />;
    case "textLink":
      return <TextLinkBlock props={block.props} />;
    case "footer":
      return <FooterBlock />;
    default:
      return <div className="p-4 text-gray-400">不明なブロック</div>;
  }
}
