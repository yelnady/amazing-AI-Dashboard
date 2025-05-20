import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Data Visualization Dashboard",
  description: "Upload data and create visualizations using natural language",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className={`font-jakarta antialiased bg-gray-50`}>{children}</body>
    </html>
  );
}
