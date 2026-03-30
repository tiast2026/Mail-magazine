"use client";

import type { Block } from "@/lib/blocks";
import React from "react";

interface ProductSlot {
  imageUrl: string;
  linkUrl: string;
  altText: string;
}

interface PropertiesPanelProps {
  block: Block | null;
  onUpdateBlock: (id: string, props: Record<string, unknown>) => void;
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  multiline?: boolean;
}) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-xs font-medium text-gray-500">
        {label}
      </label>
      {multiline ? (
        <textarea
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#8c7b6b] focus:outline-none focus:ring-1 focus:ring-[#8c7b6b]"
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type={type}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#8c7b6b] focus:outline-none focus:ring-1 focus:ring-[#8c7b6b]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-xs font-medium text-gray-500">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          className="h-8 w-8 cursor-pointer rounded border border-gray-300"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-[#8c7b6b] focus:outline-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function HeaderProperties({
  block,
  onUpdate,
}: {
  block: Block;
  onUpdate: (props: Record<string, unknown>) => void;
}) {
  return (
    <>
      <InputField
        label="ブランド名"
        value={String(block.props.brandName || "")}
        onChange={(v) => onUpdate({ ...block.props, brandName: v })}
      />
      <InputField
        label="サブタイトル"
        value={String(block.props.subtitle || "")}
        onChange={(v) => onUpdate({ ...block.props, subtitle: v })}
      />
    </>
  );
}

function BannerProperties({
  block,
  onUpdate,
}: {
  block: Block;
  onUpdate: (props: Record<string, unknown>) => void;
}) {
  return (
    <>
      <InputField
        label="画像URL"
        value={String(block.props.imageUrl || "")}
        onChange={(v) => onUpdate({ ...block.props, imageUrl: v })}
      />
      <InputField
        label="リンクURL"
        value={String(block.props.linkUrl || "")}
        onChange={(v) => onUpdate({ ...block.props, linkUrl: v })}
      />
      <InputField
        label="代替テキスト"
        value={String(block.props.altText || "")}
        onChange={(v) => onUpdate({ ...block.props, altText: v })}
      />
    </>
  );
}

function MessageProperties({
  block,
  onUpdate,
}: {
  block: Block;
  onUpdate: (props: Record<string, unknown>) => void;
}) {
  return (
    <>
      <InputField
        label="サブタイトル"
        value={String(block.props.subtitle || "")}
        onChange={(v) => onUpdate({ ...block.props, subtitle: v })}
      />
      <InputField
        label="タイトル"
        value={String(block.props.title || "")}
        onChange={(v) => onUpdate({ ...block.props, title: v })}
      />
      <InputField
        label="本文"
        value={String(block.props.description || "")}
        onChange={(v) => onUpdate({ ...block.props, description: v })}
        multiline
      />
      <ColorField
        label="背景色"
        value={String(block.props.bgColor || "#f7f4f1")}
        onChange={(v) => onUpdate({ ...block.props, bgColor: v })}
      />
    </>
  );
}

function ProductSingleProperties({
  block,
  onUpdate,
}: {
  block: Block;
  onUpdate: (props: Record<string, unknown>) => void;
}) {
  return (
    <>
      <InputField
        label="ランク（空欄で非表示）"
        value={String(block.props.rank || "")}
        onChange={(v) => onUpdate({ ...block.props, rank: v })}
      />
      <InputField
        label="画像URL"
        value={String(block.props.imageUrl || "")}
        onChange={(v) => onUpdate({ ...block.props, imageUrl: v })}
      />
      <InputField
        label="商品名"
        value={String(block.props.productName || "")}
        onChange={(v) => onUpdate({ ...block.props, productName: v })}
      />
      <InputField
        label="定価"
        value={String(block.props.originalPrice || "")}
        onChange={(v) => onUpdate({ ...block.props, originalPrice: v })}
      />
      <InputField
        label="セール価格"
        value={String(block.props.salePrice || "")}
        onChange={(v) => onUpdate({ ...block.props, salePrice: v })}
      />
      <InputField
        label="リンクURL"
        value={String(block.props.linkUrl || "")}
        onChange={(v) => onUpdate({ ...block.props, linkUrl: v })}
      />
      <InputField
        label="ボタンテキスト"
        value={String(block.props.buttonText || "")}
        onChange={(v) => onUpdate({ ...block.props, buttonText: v })}
      />
    </>
  );
}

function ProductGridProperties({
  block,
  onUpdate,
}: {
  block: Block;
  onUpdate: (props: Record<string, unknown>) => void;
}) {
  const products = (block.props.products as ProductSlot[]) || [];
  const columns = Number(block.props.columns || 2);
  const rows = Number(block.props.rows || 1);

  const updateProduct = (idx: number, field: string, value: string) => {
    const newProducts = [...products];
    if (!newProducts[idx]) {
      newProducts[idx] = { imageUrl: "", linkUrl: "", altText: "" };
    }
    newProducts[idx] = { ...newProducts[idx], [field]: value };
    onUpdate({ ...block.props, products: newProducts });
  };

  const updateGridSize = (newRows: number, newCols: number) => {
    const totalSlots = newRows * newCols;
    const newProducts = [...products];
    while (newProducts.length < totalSlots) {
      newProducts.push({
        imageUrl: "",
        linkUrl: "https://example.com",
        altText: `商品${newProducts.length + 1}`,
      });
    }
    onUpdate({
      ...block.props,
      rows: newRows,
      columns: newCols,
      products: newProducts.slice(0, totalSlots),
    });
  };

  const totalSlots = columns * rows;

  return (
    <>
      <div className="mb-3 flex gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            列数
          </label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={columns}
            onChange={(e) => updateGridSize(rows, Number(e.target.value))}
          >
            <option value={2}>2列</option>
            <option value={3}>3列</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            行数
          </label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={rows}
            onChange={(e) => updateGridSize(Number(e.target.value), columns)}
          >
            <option value={1}>1行</option>
            <option value={2}>2行</option>
            <option value={3}>3行</option>
          </select>
        </div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: totalSlots }, (_, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-gray-200 bg-gray-50 p-3"
          >
            <p className="mb-2 text-xs font-semibold text-gray-500">
              商品{idx + 1}
            </p>
            <InputField
              label="画像URL"
              value={products[idx]?.imageUrl || ""}
              onChange={(v) => updateProduct(idx, "imageUrl", v)}
            />
            <InputField
              label="リンクURL"
              value={products[idx]?.linkUrl || ""}
              onChange={(v) => updateProduct(idx, "linkUrl", v)}
            />
            <InputField
              label="代替テキスト"
              value={products[idx]?.altText || ""}
              onChange={(v) => updateProduct(idx, "altText", v)}
            />
          </div>
        ))}
      </div>
    </>
  );
}

function CtaButtonProperties({
  block,
  onUpdate,
}: {
  block: Block;
  onUpdate: (props: Record<string, unknown>) => void;
}) {
  return (
    <>
      <InputField
        label="ボタンテキスト"
        value={String(block.props.text || "")}
        onChange={(v) => onUpdate({ ...block.props, text: v })}
      />
      <InputField
        label="リンクURL"
        value={String(block.props.linkUrl || "")}
        onChange={(v) => onUpdate({ ...block.props, linkUrl: v })}
      />
      <ColorField
        label="背景色"
        value={String(block.props.bgColor || "#8c7b6b")}
        onChange={(v) => onUpdate({ ...block.props, bgColor: v })}
      />
    </>
  );
}

function CouponButtonProperties({
  block,
  onUpdate,
}: {
  block: Block;
  onUpdate: (props: Record<string, unknown>) => void;
}) {
  return (
    <>
      <InputField
        label="ボタンテキスト"
        value={String(block.props.text || "")}
        onChange={(v) => onUpdate({ ...block.props, text: v })}
      />
      <InputField
        label="リンクURL"
        value={String(block.props.linkUrl || "")}
        onChange={(v) => onUpdate({ ...block.props, linkUrl: v })}
      />
    </>
  );
}

function TextLinkProperties({
  block,
  onUpdate,
}: {
  block: Block;
  onUpdate: (props: Record<string, unknown>) => void;
}) {
  return (
    <>
      <InputField
        label="テキスト"
        value={String(block.props.text || "")}
        onChange={(v) => onUpdate({ ...block.props, text: v })}
      />
      <InputField
        label="リンクURL"
        value={String(block.props.linkUrl || "")}
        onChange={(v) => onUpdate({ ...block.props, linkUrl: v })}
      />
    </>
  );
}

function FooterProperties({
  block,
  onUpdate,
}: {
  block: Block;
  onUpdate: (props: Record<string, unknown>) => void;
}) {
  return (
    <>
      <InputField
        label="新作一覧URL"
        value={String(block.props.newItemsUrl || "")}
        onChange={(v) => onUpdate({ ...block.props, newItemsUrl: v })}
      />
      <InputField
        label="レビューURL"
        value={String(block.props.reviewUrl || "")}
        onChange={(v) => onUpdate({ ...block.props, reviewUrl: v })}
      />
    </>
  );
}

const blockTypeLabels: Record<string, string> = {
  header: "ヘッダー",
  banner: "バナー画像",
  message: "メッセージ",
  productSingle: "商品（大）",
  productGrid: "商品グリッド",
  ctaButton: "CTAボタン",
  couponButton: "クーポン",
  divider: "区切り線",
  textLink: "テキストリンク",
  footer: "フッター",
};

export default function PropertiesPanel({
  block,
  onUpdateBlock,
}: PropertiesPanelProps) {
  if (!block) {
    return (
      <div className="flex h-full w-[320px] flex-col border-l border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700">プロパティ</h3>
        </div>
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-gray-400">
          ブロックを選択すると
          <br />
          ここで編集できます
        </div>
      </div>
    );
  }

  const onUpdate = (props: Record<string, unknown>) => {
    onUpdateBlock(block.id, props);
  };

  const renderProperties = () => {
    switch (block.type) {
      case "header":
        return <HeaderProperties block={block} onUpdate={onUpdate} />;
      case "banner":
        return <BannerProperties block={block} onUpdate={onUpdate} />;
      case "message":
        return <MessageProperties block={block} onUpdate={onUpdate} />;
      case "productSingle":
        return <ProductSingleProperties block={block} onUpdate={onUpdate} />;
      case "productGrid":
        return <ProductGridProperties block={block} onUpdate={onUpdate} />;
      case "ctaButton":
        return <CtaButtonProperties block={block} onUpdate={onUpdate} />;
      case "couponButton":
        return <CouponButtonProperties block={block} onUpdate={onUpdate} />;
      case "textLink":
        return <TextLinkProperties block={block} onUpdate={onUpdate} />;
      case "footer":
        return <FooterProperties block={block} onUpdate={onUpdate} />;
      case "divider":
        return (
          <p className="text-sm text-gray-400">
            区切り線にはプロパティがありません
          </p>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full w-[320px] flex-col border-l border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700">
          {blockTypeLabels[block.type] || block.type} の設定
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4">{renderProperties()}</div>
    </div>
  );
}
