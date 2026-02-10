import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";

const sarabun = Sarabun({
  variable: "--font-sarabun",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ระบบนับคะแนนเลือกตั้ง | โรงเรียนรัตนโกสินทร์สมโภชลาดกระบัง",
  description: "ระบบกระดานคะแนนเลือกตั้งแบบเรียลไทม์ & ระบบตรวจสอบความโปร่งใส",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${sarabun.variable} antialiased`} style={{ fontFamily: 'var(--font-sarabun)' }}>
        {children}
      </body>
    </html>
  );
}
