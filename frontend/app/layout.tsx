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

        <header className="sticky top-0 z-20 backdrop-blur bg-white/80 border-b border-stone-200">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center justify-between h-14">
              <Link href="/" className="flex items-center gap-3 group">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center text-white text-sm font-bold tracking-wider"
                  style={{ backgroundColor: "var(--brand-primary)" }}
                >
                  {brand?.logoText?.charAt(0) ?? "M"}
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold tracking-wider text-stone-900">
                    {brand?.logoText ?? "メルマガ管理"}
                  </div>
                  <div className="text-[10px] text-stone-500">
                    {brand?.tagline}
                  </div>
                </div>
              </Link>

              <div className="flex items-center gap-2">
                <span
                  className="text-xs px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: "var(--brand-accent)" }}
                >
                  {brand?.channel === "rakuten" ? "楽天" : "自社"}
                </span>
                <span className="text-xs text-stone-500">
                  編集中：<b className="text-stone-700">{brand?.name}</b>
                </span>
              </div>
            </div>

            <nav className="flex gap-1 -mb-px">
              <NavLink href="/">ダッシュボード</NavLink>
              <NavLink href="/templates">テンプレート</NavLink>
              <NavLink href="/outputs">配信メルマガ</NavLink>
              <div className="flex-1" />
              <NavLink href="/settings">設定</NavLink>
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
          {children}
        </main>

        <footer className="border-t border-stone-200 bg-white py-6 text-center text-xs text-stone-500">
          <div className="max-w-6xl mx-auto px-6">
            <span>{brand?.name} メルマガ管理システム</span>
            {brands.length > 1 && (
              <span className="ml-2 opacity-70">
                （{brands.map((b) => b.name).join(" / ")}）
              </span>
            )}
          </div>
        </footer>
      </body>
    </html>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-sm px-3 py-2 text-stone-600 hover:text-stone-900 border-b-2 border-transparent hover:border-stone-300 transition-colors"
    >
      {children}
    </Link>
  );
}
