import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const font = Be_Vietnam_Pro({ subsets: ["vietnamese", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-be-vietnam" });

export const metadata: Metadata = { title: "LNS OMS – Quản lý đơn hàng", description: "MVP 1.0 Order Management System" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={font.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
