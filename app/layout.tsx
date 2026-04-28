import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BobComm · hibob",
  description: "Commission management by hibob",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full" style={{ background: "var(--bob-cream)" }}>
        {children}
      </body>
    </html>
  );
}
