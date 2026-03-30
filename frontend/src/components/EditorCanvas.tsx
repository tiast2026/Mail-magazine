"use client";

import React from "react";
import type { Block } from "@/lib/blocks";
import BlockRenderer from "./BlockRenderer";

interface EditorCanvasProps {
  blocks: Block[];
  selectedBlockId: string | null;
  dragOverIndex: number | null;
  onSelectBlock: (id: string | null) => void;
  onDeleteBlock: (id: string) => void;
  onDragStartBlock: (e: React.DragEvent, index: number) => void;
  onDragOverCanvas: (e: React.DragEvent, index: number) => void;
  onDragLeaveCanvas: () => void;
  onDropCanvas: (e: React.DragEvent, index: number) => void;
  onDropEnd: () => void;
}

export default function EditorCanvas({
  blocks,
  selectedBlockId,
  dragOverIndex,
  onSelectBlock,
  onDeleteBlock,
  onDragStartBlock,
  onDragOverCanvas,
  onDragLeaveCanvas,
  onDropCanvas,
  onDropEnd,
}: EditorCanvasProps) {
  const blockTypeLabels: Record<string, string> = {
    header: "ヘッダー",
    banner: "バナー",
    message: "メッセージ",
    productSingle: "商品（大）",
    productGrid: "商品グリッド",
    ctaButton: "CTAボタン",
    couponButton: "クーポン",
    divider: "区切り線",
    textLink: "テキストリンク",
    footer: "フッター",
  };

  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{ backgroundColor: "#e8e2db" }}
    >
      <div className="mx-auto my-8 w-full max-w-[600px]">
        <div
          className="min-h-[400px] bg-white shadow-lg"
          onClick={(e) => {
            if (e.target === e.currentTarget) onSelectBlock(null);
          }}
        >
          {blocks.length === 0 && (
            <div
              className="flex h-[400px] flex-col items-center justify-center text-gray-400"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }}
              onDrop={(e) => onDropCanvas(e, 0)}
            >
              <svg
                className="mb-3 h-12 w-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <p className="text-sm">
                テンプレートを選択するか、ブロックをドラッグしてください
              </p>
            </div>
          )}

          {blocks.map((block, index) => {
            const isSelected = block.id === selectedBlockId;
            return (
              <React.Fragment key={block.id}>
                {/* Drop indicator line */}
                {dragOverIndex === index && (
                  <div className="mx-4 h-0.5 bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.5)]" />
                )}
                <div
                  className={`group relative transition-all ${
                    isSelected
                      ? "ring-2 ring-blue-500 ring-offset-1"
                      : "hover:ring-1 hover:ring-gray-300"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBlock(block.id);
                  }}
                  draggable
                  onDragStart={(e) => onDragStartBlock(e, index)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    onDragOverCanvas(e, index);
                  }}
                  onDragLeave={onDragLeaveCanvas}
                  onDrop={(e) => onDropCanvas(e, index)}
                  onDragEnd={onDropEnd}
                >
                  {/* Drag handle */}
                  <div className="absolute left-0 top-0 z-10 flex h-full w-6 cursor-grab items-start justify-center pt-2 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing">
                    <span className="text-xs text-gray-400">⠿</span>
                  </div>

                  {/* Block type label */}
                  <div className="absolute left-7 top-1 z-10 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="rounded bg-gray-800/70 px-1.5 py-0.5 text-[10px] text-white">
                      {blockTypeLabels[block.type] || block.type}
                    </span>
                  </div>

                  {/* Delete button */}
                  <div className="absolute right-1 top-1 z-10 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteBlock(block.id);
                      }}
                      className="flex h-5 w-5 items-center justify-center rounded bg-red-500 text-xs text-white shadow hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>

                  {/* Block content */}
                  <BlockRenderer block={block} />
                </div>
              </React.Fragment>
            );
          })}

          {/* Final drop zone */}
          {blocks.length > 0 && (
            <div
              className="h-16"
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                onDragOverCanvas(e, blocks.length);
              }}
              onDragLeave={onDragLeaveCanvas}
              onDrop={(e) => onDropCanvas(e, blocks.length)}
            >
              {dragOverIndex === blocks.length && (
                <div className="mx-4 mt-0 h-0.5 bg-blue-500 shadow-[0_0_4px_rgba(59,130,246,0.5)]" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
