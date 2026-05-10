import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import HeaderActions from "@/components/HeaderActions";
import HeaderTabs from "@/components/HeaderTabs";
import ThemeSync from "@/components/ThemeSync";
import { AuthProvider } from "@/lib/auth-context";

const themeBootstrap = `(function(){try{var t=localStorage.getItem('huish-theme');var r=t==='light'||t==='dark'?t:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');if(r==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_NAME = "Huishtansen Eats";
const SITE_DESCRIPTION =
  "The Huish family recipe collection. Plan, cook, and shop together.";

export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE_NAME,
  },
  openGraph: {
    type: "website",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#047857",
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
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeSync />
        <AuthProvider>
          <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
              <a
                href="/"
                className="flex items-center gap-2 shrink-0 text-slate-900 dark:text-slate-100"
              >
                <span className="text-2xl">🍳</span>
                <h1 className="hidden sm:block text-lg font-bold tracking-tight">
                  Huishtansen Eats
                </h1>
              </a>
              <HeaderTabs />
              <HeaderActions />
            </div>
          </header>
          <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
