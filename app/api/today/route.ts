import { NextResponse } from "next/server";
import { loadCurrentData } from "../../data";
import { HERO_CATEGORY } from "../../categories";

// 정적 캐시. 데이터 커밋 시 /api/revalidate가 무효화한다.
export const dynamic = "force-static";

// 크롬 확장 등 외부에서 읽을 수 있도록 CORS 허용.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=600",
};

export async function GET() {
  const data = await loadCurrentData();
  const issue = data.categories[HERO_CATEGORY];
  return NextResponse.json(
    {
      date: data.date,
      updated_at: data.updated_at ?? null,
      keywords: (issue?.keywords ?? []).map((k) => ({
        rank: k.rank,
        word: k.word,
        description: k.description ?? null,
      })),
    },
    { headers: CORS }
  );
}
