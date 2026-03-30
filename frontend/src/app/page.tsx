"use client";

import { useState, useCallback } from "react";
import type { Block, BlockType } from "@/lib/blocks";
import { createBlock, templates, loadTemplate } from "@/lib/blocks";
import { generateFullHtml } from "@/lib/html-generator";
import BlockPalette from "@/components/BlockPalette";
import EditorCanvas from "@/components/EditorCanvas";
import PropertiesPanel from "@/components/PropertiesPanel";
import ExportModal from "@/components/ExportModal";

export default function EditorPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<number>(-1);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportedHtml, setExportedHtml] = useState("");

  // Drag state refs (using data transfer)
  const DRAG_TYPE_PALETTE = "application/x-palette-block";
  const DRAG_TYPE_CANVAS = "application/x-canvas-index";

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;

  const handleSelectTemplate = useCallback((index: number) => {
    setSelectedTemplate(index);
    if (index >= 0 && index < templates.length) {
      setBlocks(loadTemplate(templates[index]));
      setSelectedBlockId(null);
    }
  }, []);

  const handleDeleteBlock = useCallback(
    (id: string) => {
      setBlocks((prev) => prev.filter((b) => b.id !== id));
      if (selectedBlockId === id) {
        setSelectedBlockId(null);
      }
    },
    [selectedBlockId]
  );

  const handleUpdateBlock = useCallback(
    (id: string, newProps: Record<string, unknown>) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, props: newProps } : b))
      );
    },
    []
  );

  // Drag from palette
  const handleDragStartFromPalette = useCallback(
    (e: React.DragEvent, type: BlockType) => {
      e.dataTransfer.setData(DRAG_TYPE_PALETTE, type);
      e.dataTransfer.effectAllowed = "copy";
    },
    [DRAG_TYPE_PALETTE]
  );

  // Drag from canvas (reorder)
  const handleDragStartBlock = useCallback(
    (e: React.DragEvent, index: number) => {
      e.dataTransfer.setData(DRAG_TYPE_CANVAS, String(index));
      e.dataTransfer.effectAllowed = "move";
    },
    [DRAG_TYPE_CANVAS]
  );

  const handleDragOverCanvas = useCallback(
    (_e: React.DragEvent, index: number) => {
      setDragOverIndex(index);
    },
    []
  );

  const handleDragLeaveCanvas = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDropCanvas = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      setDragOverIndex(null);

      // Check if dropping from palette
      const paletteType = e.dataTransfer.getData(DRAG_TYPE_PALETTE);
      if (paletteType) {
        const newBlock = createBlock(paletteType as BlockType);
        setBlocks((prev) => {
          const next = [...prev];
          next.splice(dropIndex, 0, newBlock);
          return next;
        });
        setSelectedBlockId(newBlock.id);
        return;
      }

      // Check if reordering from canvas
      const canvasIndex = e.dataTransfer.getData(DRAG_TYPE_CANVAS);
      if (canvasIndex !== "") {
        const fromIndex = Number(canvasIndex);
        setBlocks((prev) => {
          const next = [...prev];
          const [moved] = next.splice(fromIndex, 1);
          const adjustedIndex =
            dropIndex > fromIndex ? dropIndex - 1 : dropIndex;
          next.splice(adjustedIndex, 0, moved);
          return next;
        });
      }
    },
    [DRAG_TYPE_PALETTE, DRAG_TYPE_CANVAS]
  );

  const handleDropEnd = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleExport = useCallback(() => {
    const html = generateFullHtml(blocks);
    setExportedHtml(html);
    setShowExportModal(true);
  }, [blocks]);

  return (
    <div className="flex h-screen flex-col">
      {/* Top toolbar */}
      <div className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
        <div className="flex items-center gap-4">
          <h1
            className="text-base font-semibold tracking-widest"
            style={{ color: "#8c7b6b" }}
          >
            ＮＯＡＨＬ
          </h1>
          <span className="text-xs text-gray-400">|</span>
          <span className="text-sm text-gray-600">メルマガエディタ</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {blocks.length} ブロック
          </span>
          <button
            onClick={handleExport}
            disabled={blocks.length === 0}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-40"
            style={{ backgroundColor: "#8c7b6b" }}
          >
            HTMLを出力
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <BlockPalette
          selectedTemplate={selectedTemplate}
          onSelectTemplate={handleSelectTemplate}
          onDragStartFromPalette={handleDragStartFromPalette}
        />

        {/* Center canvas */}
        <EditorCanvas
          blocks={blocks}
          selectedBlockId={selectedBlockId}
          dragOverIndex={dragOverIndex}
          onSelectBlock={setSelectedBlockId}
          onDeleteBlock={handleDeleteBlock}
          onDragStartBlock={handleDragStartBlock}
          onDragOverCanvas={handleDragOverCanvas}
          onDragLeaveCanvas={handleDragLeaveCanvas}
          onDropCanvas={handleDropCanvas}
          onDropEnd={handleDropEnd}
        />

        {/* Right sidebar */}
        <PropertiesPanel
          block={selectedBlock}
          onUpdateBlock={handleUpdateBlock}
        />
      </div>

      {/* Export modal */}
      {showExportModal && (
        <ExportModal
          html={exportedHtml}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}
