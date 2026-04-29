"use client";

import { useEffect } from "react";
import type { BrandConfig } from "@/lib/types";

export default function BrandThemeApply({ brand }: { brand: BrandConfig }) {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", brand.colors.primary);
    root.style.setProperty("--brand-accent", brand.colors.accent);
    root.style.setProperty("--brand-muted", brand.colors.muted);
    root.style.setProperty("--brand-text", brand.colors.text);
    root.style.setProperty("--brand-subtext", brand.colors.subtext);
    root.style.setProperty("--brand-panel", brand.colors.panel);
    root.style.setProperty("--brand-border", brand.colors.border);
  }, [brand]);
  return null;
}
