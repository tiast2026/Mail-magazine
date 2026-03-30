"use client";

import { paletteItems, templates, type BlockType, type TemplateDefinition } from "@/lib/blocks";
import React from "react";

interface BlockPaletteProps {
  selectedTemplate: number;
  onSelectTemplate: (index: number) => void;
  onDragStartFromPalette: (e: React.DragEvent, type: BlockType) => void;
}

export default function BlockPalette({
  selectedTemplate,
  onSelectTemplate,
  onDragStartFromPalette,
}: BlockPaletteProps) {
  return (
    <div className="flex h-full w-[280px] flex-col border-r border-gray-200 bg-white">
      {/* Template selector */}
      <div className="border-b border-gray-200 p-4">
        <label className="mb-2 block text-xs font-semibold text-gray-500 uppercase tracking-wider">
          テンプレート
        </label>
        <select
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#8c7b6b] focus:outline-none focus:ring-1 focus:ring-[#8c7b6b]"
          value={selectedTemplate}
          onChange={(e) => onSelectTemplate(Number(e.target.value))}
        >
          <option value={-1}>テンプレートを選択...</option>
          {templates.map((t: TemplateDefinition, i: number) => (
            <option key={i} value={i}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Block palette */}
      <div className="flex-1 overflow-y-auto p-4">
        <label className="mb-3 block text-xs font-semibold text-gray-500 uppercase tracking-wider">
          ブロック一覧
        </label>
        <div className="space-y-2">
          {paletteItems.map((item) => (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => onDragStartFromPalette(e, item.type)}
              className="flex cursor-grab items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm transition-all hover:border-[#8c7b6b] hover:bg-[#f7f4f1] hover:shadow-sm active:cursor-grabbing"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded bg-white text-base shadow-sm">
                {item.icon}
              </span>
              <span className="font-medium text-gray-700">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
