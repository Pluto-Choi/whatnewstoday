import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { SITE_URL } from "./site";
import ScrollToTop from "./components/ScrollToTop";
import MobileTabBar from "./components/MobileTabBar";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-KGFN3B01DW";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "왓뉴스 | 핫이슈 · 연예 · 경제 키워드",
  description: "오늘 가장 핫한 이슈, 연예, 경제 뉴스 키워드를 한눈에. 매일 아침·저녁 자동 업데이트.",
  keywords: ["왓뉴스", "핫이슈", "연예 뉴스", "경제 키워드", "경제 뉴스", "트렌드 키워드", "오늘의 이슈", "K팝"],
  applicationName: "왓뉴스",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    types: {
      "application/rss+xml": [{ url: "/rss.xml", title: "왓뉴스" }],
    },
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "512x512" }],
  },
  openGraph: {
    title: "왓뉴스 | 핫이슈 · 연예 · 경제 키워드",
    description: "오늘 가장 핫한 이슈, 연예, 경제 뉴스 키워드를 한눈에. 매일 아침·저녁 자동 업데이트.",
    url: `${SITE_URL}/`,
    siteName: "왓뉴스",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "왓뉴스 | 핫이슈 · 연예 · 경제 키워드",
    description: "오늘 가장 핫한 이슈, 연예, 경제 뉴스 키워드를 한눈에. 매일 아침·저녁 자동 업데이트.",
  },
  verification: {
    google: [
      "Qf9yJ8A6MpHHWOtGlDYP3EtypiYmSG9j6LzoZlgEyPE",
      "5MgomuHpA7d3umCGiCPCGwYFxfDR-55op0Dgx8i-Hho",
    ],
    other: {
      "naver-site-verification": "b175ebe87bd866fe45c3baaa74e783adcb9b4d1f",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className="h-full antialiased"
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        {/* Pretendard를 렌더 비차단으로 로드한다 (media=print → onload 시 all). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href='https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';l.integrity='sha384-GIdEBaqGN9mNkDkMkzMHW8EKUqtpPIe/sLj1X7DIrnc9uPtLROJgmuDlh+3rBw0j';l.crossOrigin='anonymous';l.media='print';l.onload=function(){this.media='all'};document.head.appendChild(l);})();`,
          }}
        />
        <noscript>
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
            integrity="sha384-GIdEBaqGN9mNkDkMkzMHW8EKUqtpPIe/sLj1X7DIrnc9uPtLROJgmuDlh+3rBw0j"
            crossOrigin="anonymous"
          />
        </noscript>
      </head>
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-zinc-900 focus:shadow-lg focus:ring-2 focus:ring-orange-500 dark:focus:bg-zinc-900 dark:focus:text-white"
        >
          본문 바로가기
        </a>
        {children}
        {/* 하단 탭바에 콘텐츠가 가려지지 않도록 모바일에서만 여백 확보. */}
        <div className="h-16 lg:hidden" aria-hidden="true" />
        <MobileTabBar />
        <ScrollToTop />
        <SpeedInsights />
        <Analytics />
      </body>
      <GoogleAnalytics gaId={GA_ID} />
    </html>
  );
}