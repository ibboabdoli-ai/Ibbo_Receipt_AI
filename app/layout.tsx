import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { AppNavigation } from "../components/app-navigation";
import { ServiceWorkerRegister } from "../components/service-worker-register";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Ibbo Receipt AI",
    template: "%s · Ibbo Receipt AI",
  },
  description:
    "Secure, mobile-first receipt scanner, review workflow, and bookkeeping export dashboard.",
  applicationName: "Ibbo Receipt AI",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon",
    apple: "/apple-icon",
  },
  appleWebApp: {
    capable: true,
    title: "Receipt AI",
    statusBarStyle: "default",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 font-sans antialiased">
        <ServiceWorkerRegister />
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
          <header className="sticky top-0 z-10 mb-6 rounded-3xl border border-slate-200 bg-white/90 p-3 shadow-soft backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-lg font-black text-white">
                  AI
                </span>
                <span>
                  <span className="block text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Ibbo
                  </span>
                  <span className="block text-lg font-black text-slate-950">
                    Receipt AI
                  </span>
                </span>
              </Link>
              <AppNavigation />
            </div>
          </header>
          <main className="flex-1 pb-28 md:pb-8">{children}</main>
          <footer className="hidden border-t border-slate-200 py-5 text-center text-xs font-semibold text-slate-500 md:block">
            Private receipt workspace · Data stored in Turso and private Vercel Blob
          </footer>
        </div>
      </body>
    </html>
  );
}
