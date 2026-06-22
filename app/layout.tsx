import type { ReactNode } from "react";

export const metadata = {
  title: "Ibbo Receipt AI",
  description: "Mobile-first receipt scanner and expense dashboard.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
