import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getBrandConfig, getBrandList, getDefaultBrandId } from "@/lib/data";
import BrandThemeApply from "@/components/BrandThemeApply";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "メルマガ管理システム",
  description:
    "ブランド別メルマガテンプレート管理・生成物プレビュー・配信実績管理",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const brandId = getDefaultBrandId();
  const brand = getBrandConfig(brandId);
  const brands = getBrandList();

  const initialStyle = brand
    ? `:root{--brand-primary:${brand.colors.primary};--brand-accent:${brand.colors.accent};--brand-muted:${brand.colors.muted};--brand-text:${brand.colors.text};--brand-subtext:${brand.colors.subtext};--brand-panel:${brand.colors.panel};--brand-border:${brand.colors.border};}`
    : "";

  return (
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: initialStyle }} />
      </head>
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-800">
        {brand && <BrandThemeApply brand={brand} />}
        <header
          className="border-b"
          style={{
            backgroundColor: "var(--brand-primary)",
            borderColor: "var(--brand-primary)",
          }}
        >
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="font-semibold tracking-widest text-lg"
              >
                {brand?.logoText ?? "メルマガ管理"}
              </Link>
              <span className="text-xs opacity-80 hidden sm:inline">
                - {brand?.tagline} -
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs px-2 py-1 rounded bg-white/15 hidden sm:inline">
                {brand?.channel === "rakuten" ? "楽天" : "自社"}
              </span>
              <span className="text-xs opacity-90">
                編集中：<b>{brand?.name}</b>
              </span>
            </div>
          </div>
          <div className="max-w-5xl mx-auto px-6 pb-3">
            <nav className="flex gap-5 text-sm text-white/90">
              <Link href="/" className="hover:text-white">
                ダッシュボード
              </Link>
              <Link href="/templates" className="hover:text-white">
                テンプレート
              </Link>
              <Link href="/outputs" className="hover:text-white">
                配信メルマガ
              </Link>
              <Link href="/settings" className="hover:text-white ml-auto">
                設定
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
          {children}
        </main>
        <footer
          className="border-t py-6 text-center text-xs"
          style={{
            backgroundColor: "var(--brand-panel)",
            borderColor: "var(--brand-border)",
            color: "var(--brand-subtext)",
          }}
        >
          {brand?.name} メルマガ管理システム
          {brands.length > 1 && (
            <span className="ml-2 opacity-70">
              （ブランド: {brands.map((b) => b.name).join(" / ")}）
            </span>
          )}
        </footer>
      </body>
    </html>
  );
}
