import { cache } from "react";
import { promises as fs } from "fs";
import path from "path";
import type { Article, KeywordsData, KeywordSection, KeywordSource } from "./components/KeywordDisplay";
import { HERO_CATEGORY } from "./categories";

// 데이터는 빌드에 굽지 않고 런타임에 GitHub main에서 읽는다(데이터 커밋마다 재배포하지 않기 위해).
// 1) 현재 main 커밋 SHA를 git smart-HTTP(info/refs)로 얻는다. no-cache 응답이라 CDN 지연이 없고
//    REST API의 시간당 호출 제한도 없다. 이 fetch에만 태그를 달아 /api/revalidate가 무효화한다.
// 2) 파일은 raw.githubusercontent의 SHA 고정 URL로 읽는다. 내용이 불변이라 영구 캐시해도 되고,
//    한 렌더의 모든 파일이 같은 커밋에서 오므로 "반쯤 갱신된" 섞임이 생기지 않는다.
// 실패(네트워크/비200)는 throw → 빈 데이터로 렌더하지 않고 ISR이 마지막 정상 페이지를 계속 서빙한다.
// 로컬 개발(next dev)이나 DATA_SOURCE=local이면 예전처럼 data/ 파일을 직접 읽는다.
// DATA_REPO/DATA_RAW는 테스트용 덮어쓰기(로컬 GitHub 흉내 서버).
const LOCAL = process.env.NODE_ENV === "development" || process.env.DATA_SOURCE === "local";
const REPO = process.env.DATA_REPO ?? "https://github.com/Pluto-Choi/whatnewstoday";
const RAW = process.env.DATA_RAW ?? "https://raw.githubusercontent.com/Pluto-Choi/whatnewstoday";
const DATA_DIR = path.join(process.cwd(), "data");
export const DATA_TAG = "data-ref";

async function getDataSha(): Promise<string> {
  const res = await fetch(`${REPO}.git/info/refs?service=git-upload-pack`, {
    cache: "force-cache",
    next: { tags: [DATA_TAG] },
  });
  if (!res.ok) throw new Error(`data ref fetch failed: ${res.status}`);
  const m = (await res.text()).match(/([0-9a-f]{40}) refs\/heads\/main\n/);
  if (!m) throw new Error("data ref: refs/heads/main not found");
  return m[1];
}

// 정적 생성·재생성 때 페이지마다 같은 JSON을 다시 파싱하지 않도록 파싱 결과를 프로세스 전역
// 메모이즈한다. 키는 커밋 SHA라 내용이 불변이고, SHA가 바뀌면 이전 커밋 것은 비운다.
// 실패 프로미스는 캐시하지 않아 재시도를 허용한다. optional 파일이 없으면 null.
let memoRef = "";
const parsed = new Map<string, Promise<unknown>>();
async function readJson<T>(rel: string, optional = false): Promise<T | null> {
  const ref = LOCAL ? "local" : await getDataSha();
  if (ref !== memoRef) {
    parsed.clear();
    memoRef = ref;
  }
  let p = parsed.get(rel);
  if (!p) {
    p = LOCAL
      ? fs.readFile(path.join(DATA_DIR, rel), "utf-8").then(JSON.parse, (err) => {
          if (optional) return null;
          throw err;
        })
      : fetch(`${RAW}/${ref}/data/${rel}`, { cache: "force-cache" }).then((res) => {
          if (res.status === 404 && optional) return null;
          if (!res.ok) throw new Error(`data fetch failed: ${rel} ${res.status}`);
          return res.json();
        });
    const self = p;
    self.catch(() => parsed.get(rel) === self && parsed.delete(rel));
    parsed.set(rel, self);
  }
  return p as Promise<T | null>;
}

export async function loadCurrentData(): Promise<KeywordsData> {
  return (await readJson<KeywordsData>("keywords.json"))!;
}

// 본문(소제목) 데이터는 keywords.json과 분리해 side file로 관리한다.
// 수집(collect.py)은 keywords.json을 매번 덮어쓰지만 sections.json은 건드리지 않으므로,
// 구독 플랜으로 로컬 생성한 본문이 수집 주기와 무관하게 보존된다.
type SectionEntry = {
  sections: KeywordSection[];
  sources?: KeywordSource[];
  generated_at?: string;
};

export async function loadSections(): Promise<{ [word: string]: SectionEntry }> {
  return (await readJson<{ [word: string]: SectionEntry }>("sections.json", true)) ?? {};
}

export type TrendEntry = {
  date: string;
  category: string;
  rank: number;
  count: number;
};

export type Streak = {
  word: string;
  category: string;
  streak: number;
  start: string;
  end: string;
  ai_summary: string | null;
};

export type TrendsData = {
  generated_at: string;
  days: number;
  keywords: { [word: string]: TrendEntry[] };
  streaks: { [period: string]: Streak[] };
};

export async function loadTrends(): Promise<TrendsData | null> {
  return readJson<TrendsData>("trends.json", true);
}

// 날짜별 history는 [date] 페이지·trends 아카이브·키워드 상세가 모두 같은 파일을 읽는다.
export async function loadHistoryData(date: string): Promise<KeywordsData | null> {
  // 경로 조작 방지: YYYY-MM-DD 형식만 파일·원격 경로에 닿게 한다(심층 방어).
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return readJson<KeywordsData>(`history/${date}.json`, true);
}

// 원격에선 디렉터리 목록을 못 읽는다. trends.json은 history 전 파일로 만들어지므로
// (collect.py: days=len(files)) 거기 등장한 날짜 집합 = history 파일 목록.
async function listHistoryDates(): Promise<string[]> {
  const trends = await loadTrends();
  if (!trends) return [];
  const dates = new Set<string>();
  for (const entries of Object.values(trends.keywords)) for (const e of entries) dates.add(e.date);
  return [...dates].sort().reverse();
}

export async function getRecentDates(limit = 7): Promise<string[]> {
  return (await listHistoryDates()).slice(0, limit);
}

export async function getAllDates(): Promise<string[]> {
  return listHistoryDates();
}

export async function getAllKeywords(): Promise<string[]> {
  const trends = await loadTrends();
  return trends ? Object.keys(trends.keywords) : [];
}

export type DateArchiveEntry = {
  date: string;
  topWords: string[]; // 그날 "오늘의 이슈" 상위 3개 키워드 구(헤드라인 우선, 순위순)
};

// 날짜별 둘러보기용. 수집된 모든 날짜를 최신순으로, 각 날짜의 대표 이슈 키워드와 함께 반환한다.
export async function getDateArchive(): Promise<DateArchiveEntry[]> {
  const dates = await listHistoryDates();
  return Promise.all(
    dates.map(async (date) => {
      const data = await loadHistoryData(date);
      const issue = data?.categories[HERO_CATEGORY];
      const topWords = (issue?.keywords ?? [])
        .slice(0, 3)
        .map((k) => k.headline || k.word);
      return { date, topWords };
    }),
  );
}

export type KeywordDetail = {
  word: string;
  entries: TrendEntry[]; // 날짜 내림차순
  daysCount: number;
  peakRank: number;
  categories: string[];
  latestDate: string;
  description?: string;
  headline?: string;
  sections?: KeywordSection[];
  sources?: KeywordSource[];
  articles: Article[];
};

export const getKeywordDetail = cache(async (rawTerm: string): Promise<KeywordDetail | null> => {
  const trends = await loadTrends();
  if (!trends) return null;

  let word = rawTerm;
  let entries = trends.keywords[word];
  if (!entries) {
    try {
      word = decodeURIComponent(rawTerm);
      entries = trends.keywords[word];
    } catch {}
  }
  if (!entries || entries.length === 0) return null;

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted[0];

  // 오늘 등장한 키워드는 history에 아직 없으므로 현재 데이터로 폴백.
  const source = (await loadHistoryData(latest.date)) ?? (await loadCurrentData());
  const keyword = source?.categories[latest.category]?.keywords.find((k) => k.word === word);

  // 본문(소제목)은 side file(sections.json)에서 키워드 단어로 조회한다.
  // 없으면 description 폴백이 자동으로 동작한다(page.tsx의 hasSections 분기).
  const sectionEntry = (await loadSections())[word];

  return {
    word,
    entries: sorted,
    daysCount: entries.length,
    peakRank: Math.min(...entries.map((e) => e.rank)),
    categories: [...new Set(entries.map((e) => e.category))],
    latestDate: latest.date,
    description: keyword?.description,
    headline: keyword?.headline,
    sections: sectionEntry?.sections,
    sources: sectionEntry?.sources,
    articles: keyword?.articles ?? [],
  };
});

export type RankChange =
  | { type: "new" }
  | { type: "up" | "down"; delta: number }
  | { type: "same" };

export type RankChanges = {
  [category: string]: { [word: string]: RankChange };
};

/**
 * 주어진 날짜의 직전 history와 비교해 카테고리별 키워드 순위 변동을 계산한다.
 * date를 생략하면 현재 데이터(keywords.json)와 가장 최근 직전 날짜를 비교한다.
 */
export async function getRankChanges(current: KeywordsData): Promise<RankChanges> {
  const dates = await listHistoryDates();
  // current.date 이전의 가장 가까운 날짜를 찾는다 (같은 날짜 파일은 제외).
  const prevDate = dates.find((d) => d < current.date);
  if (!prevDate) return {};
  const prev = await loadHistoryData(prevDate);
  if (!prev) return {};

  const changes: RankChanges = {};
  for (const [category, catData] of Object.entries(current.categories)) {
    const prevRanks = new Map<string, number>();
    for (const k of prev.categories[category]?.keywords ?? []) {
      prevRanks.set(k.word, k.rank);
    }
    const catChanges: { [word: string]: RankChange } = {};
    for (const k of catData.keywords) {
      const before = prevRanks.get(k.word);
      if (before === undefined) {
        catChanges[k.word] = { type: "new" };
      } else if (before > k.rank) {
        catChanges[k.word] = { type: "up", delta: before - k.rank };
      } else if (before < k.rank) {
        catChanges[k.word] = { type: "down", delta: k.rank - before };
      } else {
        catChanges[k.word] = { type: "same" };
      }
    }
    changes[category] = catChanges;
  }
  return changes;
}
