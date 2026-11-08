import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import KeywordDisplay from "../components/KeywordDisplay";
import AppShell from "../components/AppShell";
import UpdatedAt from "../components/UpdatedAt";
import { jsonLdHtml } from "../jsonld";
import { loadHistoryData, getRankChanges, getAllDates } from "../data";
import { HERO_CATEGORY } from "../categories";

type Props = { params: Promise<{ date: string }> };

// 빌드 때 미리 굽지 않고 첫 방문 시 렌더 후 ISR 캐시(데이터 커밋 시 /api/revalidate로 무효화).
// 형식 밖/없는 날짜는 loadHistoryData가 null → 404(형식 밖은 원격에 닿기 전 차단).
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  const data = await loadHistoryData(date);
  if (!data) return { title: "왓뉴스" };
  const issue = data.categories[HERO_CATEGORY];
  const issueKeywords = issue?.keywords.slice(0, 3).map((k) => k.word) ?? [];
  const keywordStr = issueKeywords.join(" · ");
  const title = keywordStr ? `${date} 뉴스 | ${keywordStr}` : `${date} 뉴스 | 왓뉴스`;
  const description = issue?.summary
    ? `${date} 핫이슈 — ${issue.summary}`
    : `${date}의 핫이슈, 연예, 경제 뉴스 키워드 TOP5.`;
  const ogImage = `/opengraph-image?v=${encodeURIComponent(`${date}-${issueKeywords[0] ?? ""}`)}`;
  return {
    title,
    description,
    alternates: { canonical: `/${date}` },
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

export default async function HistoryPage({ params }: Props) {
  const { date } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const [data, allDates] = await Promise.all([loadHistoryData(date), getAllDates()]);

  if (!data) notFound();

  const rankChanges = await getRankChanges(data);

  // allDates는 최신순(내림차순). 인접 날짜로 전날/다음날 이동을 만든다.
  const idx = allDates.indexOf(date);
  const newerDate = idx > 0 ? allDates[idx - 1] : null; // 더 최신 = 다음날
  const olderDate = idx >= 0 && idx < allDates.length - 1 ? allDates[idx + 1] : null; // 더 과거 = 전날

  return (
    <AppShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(data) }}
      />

        <h1 className="sr-only">{date} 뉴스 키워드 — 핫이슈 · 연예 · 경제 TOP5</h1>

        <p className="mb-5 text-center text-xs text-zinc-500 dark:text-zinc-400">
          <UpdatedAt updatedAt={data.updated_at} date={data.date} /> · Google News RSS
        </p>

        <nav className="mb-5 flex items-center justify-between gap-2" aria-label="날짜 이동">
          {olderDate ? (
            <Link
              href={`/${olderDate}`}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-orange-700 dark:hover:text-orange-400 transition-colors"
            >
              ← 전날
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm text-zinc-300 dark:text-zinc-600" aria-disabled="true">
              ← 전날
            </span>
          )}

          <Link
            href="/trends"
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-orange-700 dark:hover:text-orange-400 transition-colors"
          >
            ↩ 뉴스창고로 돌아가기
          </Link>

          {newerDate ? (
            <Link
              href={`/${newerDate}`}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-orange-700 dark:hover:text-orange-400 transition-colors"
            >
              다음날 →
            </Link>
          ) : (
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-orange-700 dark:hover:text-orange-400 transition-colors"
            >
              오늘 →
            </Link>
          )}
        </nav>

        <KeywordDisplay data={data} rankChanges={rankChanges} />

        <p className="text-center text-zinc-500 dark:text-zinc-400 text-xs pb-4">
          매일 아침·저녁 자동 업데이트 · Google News RSS 기반
        </p>
    </AppShell>
  );
}
