import Link from "next/link";
import type { Metadata } from "next";
import KeywordDisplay from "../components/KeywordDisplay";
import BriefingCard from "../components/BriefingCard";
import SiteHeader from "../components/SiteHeader";
import UpdatedAt from "../components/UpdatedAt";
import KeywordSearch from "../components/KeywordSearch";
import LeftSidebar from "../components/LeftSidebar";
import RightSidebar from "../components/RightSidebar";
import AdFitBanner from "../components/AdFitBanner";
import { jsonLdHtml } from "../jsonld";
import { loadCurrentData } from "../data";
import { HERO_CATEGORY } from "../categories";

export async function generateMetadata(): Promise<Metadata> {
  const data = await loadCurrentData();
  const issue = data.categories[HERO_CATEGORY];
  const issueKeywords = issue?.keywords.slice(0, 3).map((k) => k.word) ?? [];
  const keywordStr = issueKeywords.join(" · ");
  const title = keywordStr ? `왓뉴스 | ${keywordStr}` : "왓뉴스 | 핫이슈 & 경제 키워드";
  const description = issue?.summary
    ? `${data.date} 오늘의 핫이슈 — ${issue.summary}`
    : "오늘 가장 핫한 이슈, 연예, 경제 뉴스 키워드를 한눈에. 매일 아침·저녁 자동 업데이트.";
  // 키워드는 매일 바뀌지만 og:image 경로는 고정이라 메신저가 옛 이미지를 캐시함.
  // 날짜+1위 키워드로 버전을 붙여 미리보기 캐시를 매일 갱신시킨다.
  const ogImage = `/opengraph-image?v=${encodeURIComponent(`${data.date}-${issueKeywords[0] ?? ""}`)}`;
  return {
    title,
    description,
    alternates: {
      canonical: "/",
      types: {
        "application/rss+xml": [{ url: "/rss.xml", title: "왓뉴스" }],
      },
    },
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function Home() {
  const data = await loadCurrentData();

  const searchKeywords = Array.from(
    new Set(
      Object.values(data.categories).flatMap((c) => c.keywords.map((k) => k.word))
    )
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(data) }}
      />

      {/* 모바일 전용 상단 띠 배너: 페이지 최상단(제목 위)에 두되 sticky가 아니라서
          아래로 스크롤하면 자연스럽게 위로 사라진다(헤더만 상단에 고정됨).
          데스크탑은 우측 사이드바 160x600을 쓰므로 lg:hidden.
          ⚠️ 사이드바(DAN-yItNPmN2B2cR2RlZ)와 다른 단위를 써야 중복 렌더 문제가 없다. */}
      <div className="lg:hidden">
        <AdFitBanner adUnit="DAN-lsimxU6w50hliNfK" width={320} height={50} />
      </div>

      <SiteHeader widthClass="max-w-lg lg:max-w-7xl" />

      <div className="mx-auto max-w-lg lg:max-w-7xl px-4 py-3 lg:py-6 lg:grid lg:grid-cols-[30px_170px_24px_minmax(0,1fr)_24px_170px_30px] lg:gap-0 lg:items-start">
        <LeftSidebar className="hidden lg:block lg:col-start-2 lg:sticky lg:top-6" />

        <main id="main-content" tabIndex={-1} className="min-w-0 lg:col-start-4">

        <h1 className="sr-only">왓뉴스 — {data.date} 핫이슈 · 연예 · 경제 키워드 TOP5</h1>

        {data.briefing?.text && (
          <div className="mb-5 lg:mb-6">
            <BriefingCard briefing={data.briefing} />
          </div>
        )}

        <KeywordDisplay data={data} />

        {/* 검색은 "원하는 걸 아는" 2차 행동. 글랜스(랭킹 보드)를 위로 올리고
            검색창은 보드 아래로 내린다. 모바일에서는 숨기고 데스크탑(lg+)에서만 노출한다. */}
        <div id="search" className="hidden lg:block scroll-mt-20 mt-8">
          <KeywordSearch keywords={searchKeywords} />
        </div>

        {/* 업데이트 시각을 하단에 표시(데스크탑·모바일 공통). */}
        <p className="mt-8 mb-1 text-center text-xs text-zinc-500 dark:text-zinc-400">
          <UpdatedAt updatedAt={data.updated_at} date={data.date} /> · Google News RSS
        </p>

        <p className="text-center text-zinc-500 dark:text-zinc-400 text-xs pb-1">
          매일 아침·저녁 자동 업데이트 · Google News RSS 기반
        </p>
        <p className="text-center text-zinc-400 dark:text-zinc-500 text-[11px] pb-4">
          기사 저작권은 각 언론사에 있습니다 ·{" "}
          <Link href="/copyright" className="underline underline-offset-2 hover:text-orange-700 dark:hover:text-orange-400">
            저작권 안내
          </Link>
          {" · "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-orange-700 dark:hover:text-orange-400">
            개인정보처리방침
          </Link>
        </p>
        </main>

        <RightSidebar className="hidden lg:block lg:col-start-6 lg:sticky lg:top-6" />
      </div>
    </div>
  );
}
