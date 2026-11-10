// 홈/카테고리/날짜 페이지(목록형)용 구조화 데이터.
// 키워드 상세페이지(본문형)는 app/keyword/[term]/jsonld.ts에 분리돼 있다.
import type { KeywordsData } from "./components/KeywordDisplay";
import { SITE_URL as SITE } from "./site";
import { orgNode, ORG_ID, serializeJsonLd } from "./lib/structured-data";

export function buildJsonLd(data: KeywordsData) {
  const itemLists = Object.entries(data.categories)
    // 빈 카테고리(예: 스포츠 미수집일)는 "TOP0" 빈 ItemList가 되어 SEO 노이즈가 되므로 제외.
    .filter(([, cat]) => cat.keywords.length > 0)
    .map(([category, cat]) => ({
    "@type": "ItemList",
    name: `${data.date} ${category} 키워드 TOP${cat.keywords.length}`,
    description: cat.summary || undefined,
    numberOfItems: cat.keywords.length,
    itemListElement: cat.keywords.map((k) => ({
      "@type": "ListItem",
      position: k.rank,
      name: k.word,
    })),
  }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      orgNode(),
      {
        "@type": "WebSite",
        "@id": `${SITE}/#website`,
        url: `${SITE}/`,
        name: "왓뉴스",
        alternateName: ["오늘의뉴스", "오늘 뉴스 키워드", "실시간 뉴스 키워드"],
        description:
          "오늘 가장 핫한 이슈, 연예, 경제 뉴스 키워드를 한눈에. 매일 아침·저녁 자동 업데이트.",
        inLanguage: "ko-KR",
        publisher: { "@id": ORG_ID },
      },
      ...itemLists,
    ],
  };
}

export function jsonLdHtml(data: KeywordsData): string {
  return serializeJsonLd(buildJsonLd(data));
}
