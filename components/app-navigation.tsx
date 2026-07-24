"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/", label: "Dashboard" },
  { href: "/receipts", label: "Receipts" },
  { href: "/receipts/new", label: "Upload" },
  { href: "/reports", label: "Reports" },
  { href: "/tools", label: "Tools" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <>
      <nav
        aria-label="Primary navigation"
        className="hidden items-center gap-1 md:flex"
      >
        {navigation.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white"
                  : "rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
              }
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-soft backdrop-blur md:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {navigation.map((item) => {
            const active = isActive(pathname, item.href);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "rounded-2xl bg-slate-950 px-1 py-3 text-center text-xs font-black text-white"
                    : "rounded-2xl px-1 py-3 text-center text-xs font-bold text-slate-600 hover:bg-slate-100"
                }
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
