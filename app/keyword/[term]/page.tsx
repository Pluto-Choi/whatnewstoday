import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import AppShell from "../../components/AppShell";
import { getKeywordDetail } from "../../data";
import { categoryEmoji, categoryLabel, categorySlug } from "../../categories";
import { cleanTitle } from "../../lib/format";
import { keywordJsonLdHtml } from "./jsonld";

type Props = { params: Promise<{ term: string }> };

// 빌드 때 미리 굽지 않고 첫 방문 시 렌더 후 ISR 캐시(데이터 커밋 시 /api/revalidate로 무효화).
// 없는 키워드는 getKeywordDetail이 null → 404.
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { term } = await params;
  const detail = await getKeywordDetail(term);
  if (!detail) return { title: "왓뉴스" };
  const { word, headline, description, articles, latestDate } = detail;

  // 검색 결과 CTR: 추적 키워드 대다수는 headline이 없어 title이 '단어 | 왓뉴스'라
  // 검색어(구체적 구문)와 매칭이 약하고 클릭 유인이 없다. 이미 저장된 관련 기사
  // 제목(메타데이터)을 맥락으로 붙여 '무슨 뉴스인지'가 스니펫에 드러나게 한다.
  const topTitle = articles[0] ? cleanTitle(articles[0].title) : "";
  const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n).trimEnd() + "…" : s);
  const title = headline
    ? `${headline} | 왓뉴스`
    : topTitle
      ? `${word}: ${clip(topTitle, 45)} | 왓뉴스`
      : `${word} 관련 뉴스 | 왓뉴스`;

  // 폴백 설명은 '우리 순위 메타'(검색자 관심 밖)가 아니라 '최신 뉴스 + 신선도'로.
  const fallbackDescription = topTitle
    ? `${word} 관련 최신 뉴스 ${articles.length}건 — ${topTitle}. ${latestDate} 업데이트 · Google News 기반.`
    : `${word} 관련 뉴스와 순위 추이. ${latestDate} 업데이트.`;
  const metaDescription = description || fallbackDescription;

  return {
    title,
    description: metaDescription,
    alternates: { canonical: `/keyword/${encodeURIComponent(word)}` },
    openGraph: { title, description: metaDescription },
    twitter: { title, description: metaDescription },
  };
}

export default async function KeywordPage({ params }: Props) {
  const { term } = await params;
  const detail = await getKeywordDetail(term);
  if (!detail) notFound();

  const { word, headline, categories, latestDate, daysCount, peakRank, articles, description, sections } = detail;
  const title = headline || word;
  const hasSections = !!sections && sections.length > 0;

  // 설명문은 "1문장=오늘의 사실 / 나머지=배경·맥락" 구조로 생성된다.
  // 그 구조를 살려 리드 문장과 본문 문단으로 나눠 가독성을 높인다.
  const descParts = description
    ? description.split(/(?<=다\.)\s+/).map((s) => s.trim()).filter(Boolean)
    : [];
  const descLead = descParts[0] ?? description;
  // 소제목 본문이 있으면 깊이는 소제목이 담당하므로 descRest는 생략한다(중복 방지).
  const descRest = hasSections ? "" : descParts.slice(1).join(" ");

  return (
    <AppShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: keywordJsonLdHtml(detail) }}
      />
      <div className="max-w-2xl lg:py-2">
        {/* === 문서 헤더 (노션 타이틀 블록) === */}
        <header className="mb-8 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-3 text-xs text-zinc-500 dark:text-zinc-400">
            {categories.map((c) => {
              // 카테고리 배지를 해당 분야 페이지로 가는 링크로. 앱 전반에서 카테고리는
              // 이동 가능한 네비게이션인데 이 페이지만 죽은 텍스트라 일관성/탐색성을 보강.
              const slug = categorySlug[c];
              const label = `${categoryEmoji[c] || "📌"} ${categoryLabel[c] || c}`;
              return slug ? (
                <Link
                  key={c}
                  href={`/category/${slug}`}
                  className="font-medium hover:text-orange-700 dark:hover:text-orange-400 transition-colors"
                >
                  {label}
                </Link>
              ) : (
                <span key={c} className="font-medium">{label}</span>
              );
            })}
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{latestDate}</span>
          </div>

          <h1 className="text-2xl lg:text-3xl font-bold leading-snug tracking-tight break-keep">
            {title}
          </h1>

          {/* 키워드의 화제성을 한눈에: 최고 순위·등장 일수. 데이터는 이미
              계산돼 메타 설명에만 쓰이던 것을 본문에 노출해 정보 위계를 보강. */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400 tabular-nums">
              최고 {peakRank}위
            </span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 tabular-nums">
              {daysCount}일 등장
            </span>
          </div>
        </header>

        {/* === 본문 도입 (AI 요약) === */}
        {description && (
          <section className="mb-12">
            <p className="text-[17px] lg:text-lg font-bold leading-[1.85] text-zinc-800 dark:text-zinc-200 break-keep">
              {descLead}
            </p>
            {descRest && (
              <p className="mt-4 text-base leading-[1.85] text-zinc-800 dark:text-zinc-200 break-keep">
                {descRest}
              </p>
            )}
          </section>
        )}

        {/* === 소제목 본문 (급상승 키워드 전용, 웹 검색 근거) === */}
        {hasSections && (
          <div className="mb-12">
            {sections!.map((s) => (
              <section key={s.heading} className="mb-8 last:mb-0">
                <h2 className="text-lg lg:text-xl font-bold tracking-tight mb-3 break-keep">
                  {s.heading}
                </h2>
                <p className="text-base leading-[1.85] text-zinc-800 dark:text-zinc-200 break-keep">
                  {s.body}
                </p>
              </section>
            ))}
          </div>
        )}

        {/* === 관련 뉴스 === */}
        {articles.length > 0 && (
          <section className="mb-12">
            <h2 className="text-base font-bold tracking-tight mb-4 flex items-center gap-2">
              <span aria-hidden="true">📰</span>관련 뉴스
              {/* 홈 카드('관련 기사 N건')·랭킹 보드('관련 N건')와 동일한 정보 위계.
                  이 페이지만 개수를 안 보여 줘 몇 건이 있는지 미리 알 수 없던 걸 보강. */}
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-500 tabular-nums">
                {articles.length}건
              </span>
            </h2>
            <div className="flex flex-col">
              {articles.map((article) => (
                <a
                  key={article.link}
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/link flex items-start gap-3 -mx-2 px-2 py-3.5 rounded-lg border-b border-zinc-100 dark:border-zinc-800/60 first:pt-0 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40 active:bg-zinc-100 dark:active:bg-zinc-700/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] leading-snug text-zinc-800 dark:text-zinc-100 group-hover/link:text-orange-700 dark:group-hover/link:text-orange-400 transition-colors break-keep">
                      {cleanTitle(article.title)}
                    </p>
                    {article.source && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{article.source}</p>
                    )}
                  </div>
                  <span className="sr-only"> (새 탭에서 원문 열기)</span>
                  <span aria-hidden="true" className="mt-0.5 shrink-0 text-zinc-300 dark:text-zinc-600 text-xs group-hover/link:text-orange-700 dark:group-hover/link:text-orange-400 transition-colors">↗</span>
                </a>
              ))}
            </div>
          </section>
        )}

        <p className="text-zinc-500 dark:text-zinc-500 text-xs pb-4">
          누적 수집 데이터 기반 · Google News RSS
        </p>
      </div>
    </AppShell>
  );
}
