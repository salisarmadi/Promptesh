import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "پرامپت‌گالری",
  description: "گالری تصویر و پرامپت هوش مصنوعی، فارسی و رایگان",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fa" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white">{children}</body>
    </html>
  );
}
