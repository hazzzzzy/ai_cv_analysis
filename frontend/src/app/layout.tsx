import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import { Toaster } from "sonner";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "简历追问面试",
  description: "上传简历，生成专家追问并给出诊断建议",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${spaceGrotesk.variable} ${plexMono.variable} antialiased`}>
        <Toaster position="top-center" richColors />
        <div className="min-h-screen bg-[radial-gradient(1200px_circle_at_10%_-20%,#f7f3ff_0%,transparent_55%),radial-gradient(900px_circle_at_90%_10%,#e6f4ff_0%,transparent_45%),linear-gradient(160deg,#fdfcf8_0%,#f8fafc_55%,#eef2ff_100%)]">
          <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Resume Insight Lab</p>
              <h1 className="text-2xl font-semibold text-slate-900">简历追问面试系统</h1>
            </div>
            <nav className="flex items-center gap-6 text-sm text-slate-600">
                            <Link className="transition hover:text-slate-900" href="/intro">
                介绍
              </Link><Link className="transition hover:text-slate-900" href="/">
                工作台
              </Link>
              <Link className="transition hover:text-slate-900" href="/sessions">
                历史会话
              </Link>
            </nav>
          </header>
          <main className="mx-auto w-full max-w-6xl px-6 pb-16">{children}</main>
        </div>
      </body>
    </html>
  );
}
