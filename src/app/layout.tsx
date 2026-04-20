import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SiteFrame } from "@/components/site-frame";
import "./globals.css";

const chatSans = Inter({
  subsets: ["latin"],
  variable: "--font-chat-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dawn Workspace",
  description: "Dawn Blog and Network Engineer workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className={chatSans.variable}>
        <SiteFrame>{children}</SiteFrame>
      </body>
    </html>
  );
}
