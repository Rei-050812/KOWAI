"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  {
    href: "/admin/dashboard",
    label: "ダッシュボード",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M10 1L1 6v12h7v-5h4v5h7V6l-9-5z" />
      </svg>
    ),
  },
  {
    href: "/admin/blueprints",
    label: "Blueprint管理",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M3 3h14a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1zm1 3v9h12V6H4zm2 2h8v1H6V8zm0 3h5v1H6v-1z" />
      </svg>
    ),
  },
  {
    href: "/admin/blueprints/ingest",
    label: "本文から変換",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M10 2a1 1 0 011 1v4.586l1.707-1.707a1 1 0 111.414 1.414l-3.414 3.414a1 1 0 01-1.414 0L5.879 7.293a1 1 0 111.414-1.414L9 7.586V3a1 1 0 011-1zM3 13a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 1v1h10v-1H5z" />
      </svg>
    ),
  },
  {
    href: "/admin/reviews",
    label: "レビュー",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M10 1l2.39 4.84L17.82 7l-3.91 3.81.92 5.39L10 13.47 5.17 16.2l.92-5.39L2.18 7l5.43-.16L10 1z" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin/blueprints") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-52 bg-gray-950 border-r border-gray-800 shrink-0">
        <div className="px-4 py-4 border-b border-gray-800">
          <Link href="/admin/dashboard" className="block">
            <span className="text-base font-bold text-red-500 tracking-wide">
              KOWAI
            </span>
            <span className="text-[10px] text-gray-500 ml-1.5 tracking-widest uppercase">
              Admin
            </span>
          </Link>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive(pathname, href)
                  ? "bg-red-600/15 text-red-400 font-medium"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/60"
              }`}
            >
              <span
                className={
                  isActive(pathname, href) ? "text-red-400" : "text-gray-500"
                }
              >
                {icon}
              </span>
              {label}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-gray-800">
          <Link
            href="/"
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            &larr; サイトに戻る
          </Link>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-40 bg-gray-950/95 backdrop-blur border-b border-gray-800">
          <div className="flex items-center justify-between px-4 h-11">
            <Link href="/admin/dashboard" className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-red-500">KOWAI</span>
              <span className="text-[10px] text-gray-500 tracking-widest uppercase">
                Admin
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-1.5 text-gray-400 hover:text-gray-200"
              aria-label="メニュー"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                {mobileOpen ? (
                  <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                ) : (
                  <path d="M3 5h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2z" />
                )}
              </svg>
            </button>
          </div>
          {mobileOpen && (
            <nav className="border-t border-gray-800 px-2 py-2 space-y-0.5">
              {NAV_ITEMS.map(({ href, label, icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive(pathname, href)
                      ? "bg-red-600/15 text-red-400 font-medium"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/60"
                  }`}
                >
                  <span
                    className={
                      isActive(pathname, href)
                        ? "text-red-400"
                        : "text-gray-500"
                    }
                  >
                    {icon}
                  </span>
                  {label}
                </Link>
              ))}
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-500 hover:text-gray-300"
              >
                &larr; サイトに戻る
              </Link>
            </nav>
          )}
        </header>

        {/* Main content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
