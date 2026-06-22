import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ibbo Receipt AI",
  description: "Mobile-first receipt scanner and expense dashboard",
  applicationName: "Ibbo Receipt AI",
  appleWebApp: {
    capable: true,
    title: "Receipt AI",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1
};

const navigation = [
  { href: "/", label: "Dashboard" },
  { href: "/receipts", label: "Receipts" },
  { href: "/receipts/new", label: "Upload" },
  { href: "/reports", label: "Reports" }
] as const;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 font-sans antialiased">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-4 sm:px-6 lg:px-8">
          <header className="sticky top-0 z-10 mb-6 rounded-3xl border border-slate-200 bg-white/85 p-3 shadow-soft backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-lg font-black text-white">
                  AI
                </span>
                <span>
                  <span className="block text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Ibbo
                  </span>
                  <span className="block text-lg font-black text-slate-950">Receipt AI</span>
                </span>
              </Link>
              <nav className="hidden items-center gap-2 md:flex">
                {navigation.map((item) => (
                  <Link
                    className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main className="flex-1 pb-24 md:pb-8">{children}</main>
          <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-3 py-2 shadow-soft backdrop-blur md:hidden">
            <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
              {navigation.map((item) => (
                <Link
                  className="rounded-2xl px-2 py-3 text-center text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </body>
    </html>
  );
}
