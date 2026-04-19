import type { Metadata } from "next";
import { SiteFrame } from "@/components/site-frame";
import "./globals.css";

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
      <body>
        <SiteFrame>{children}</SiteFrame>
      </body>
    </html>
  );
}
