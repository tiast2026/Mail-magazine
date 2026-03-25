"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "ダッシュボード", icon: "📊" },
  { href: "/newsletters/new", label: "メルマガ生成", icon: "✨" },
  { href: "/newsletters", label: "メルマガ履歴", icon: "📧" },
  { href: "/products", label: "商品マスタ", icon: "📦" },
  { href: "/templates", label: "テンプレート", icon: "📄" },
  { href: "/clients", label: "クライアント管理", icon: "🏢" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-gray-900 text-white">
      <div className="flex h-16 items-center border-b border-gray-700 px-6">
        <h1 className="text-lg font-bold tracking-wide">メルマガ自動生成</h1>
      </div>
      <nav className="mt-4 flex flex-col gap-1 px-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
