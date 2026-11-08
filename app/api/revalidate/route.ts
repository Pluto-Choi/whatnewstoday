import { createHash, timingSafeEqual } from "crypto";
import { revalidateTag } from "next/cache";
import { DATA_TAG } from "../../data";

// 데이터 커밋 직후 collect.yml·본문 루틴(+ revalidate.yml 안전망)이 호출한다.
// 데이터 SHA 캐시를 stale로 표시해 모든 페이지가 다음 방문 때 새 커밋 데이터로 다시 렌더되게 한다.
// 'max'(stale-while-revalidate): 무효화 직후 첫 요청은 이전 페이지, 백그라운드 재렌더 후 새 데이터.
// { expire: 0 }은 데이터 소스(GitHub) 장애 시 캐시된 페이지까지 500이 돼서 쓰지 않는다.
const digest = (s: string) => createHash("sha256").update(s).digest();

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return Response.json({ ok: false, error: "REVALIDATE_SECRET not configured" }, { status: 500 });
  }
  // 길이가 달라도 비교 시간이 같도록 해시끼리 상수 시간 비교.
  const auth = request.headers.get("authorization") ?? "";
  if (!timingSafeEqual(digest(auth), digest(`Bearer ${secret}`))) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  revalidateTag(DATA_TAG, "max");
  return Response.json({ ok: true, revalidated: DATA_TAG, now: Date.now() });
}
