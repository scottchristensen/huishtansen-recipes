import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import HeaderActions from "@/components/HeaderActions";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Huish Family Recipes",
  description: "The Huishtansen family recipe collection",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Huish Recipes",
  },
};

export const viewport: Viewport = {
  themeColor: "#f59e0b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-full flex flex-col">
        <header className="bg-amber-500 text-white shadow-md">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <span className="text-2xl">🍳</span>
              <h1 className="text-xl font-bold tracking-tight">
                Huish Family Recipes
              </h1>
            </a>
            <HeaderActions />
          </div>
        </header>
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
