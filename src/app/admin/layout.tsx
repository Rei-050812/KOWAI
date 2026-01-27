"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/blueprints", label: "Blueprint" },
  { href: "/admin/blueprints/ingest", label: "Ingest" },
  { href: "/admin/reviews", label: "Reviews" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 flex items-center h-12 gap-1">
          <Link
            href="/admin/dashboard"
            className="text-sm font-bold text-red-500 mr-4 shrink-0"
          >
            KOWAI Admin
          </Link>
          {NAV_ITEMS.map(({ href, label }) => {
            const isActive =
              pathname === href ||
              (href !== "/admin/dashboard" && pathname.startsWith(href) && pathname === href);
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  isActive
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
      {children}
    </div>
  );
}
