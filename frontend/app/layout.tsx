import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NOAHL メルマガ管理",
  description: "メルマガテンプレート管理・生成物プレビュー・配信実績管理",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-800">
        <header className="border-b border-stone-200 bg-white">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="font-semibold tracking-wider">
              NOAHL メルマガ管理
            </Link>
            <nav className="flex gap-6 text-sm">
              <Link href="/" className="hover:text-stone-900 text-stone-600">
                ダッシュボード
              </Link>
              <Link
                href="/templates"
                className="hover:text-stone-900 text-stone-600"
              >
                テンプレート
              </Link>
              <Link
                href="/outputs"
                className="hover:text-stone-900 text-stone-600"
              >
                配信メルマガ
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
          {children}
        </main>
        <footer className="border-t border-stone-200 bg-white py-6 text-center text-xs text-stone-500">
          NOAHL メルマガ管理システム
        </footer>
      </body>
    </html>
  );
}
