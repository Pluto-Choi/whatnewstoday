// 홈 전용 스켈레톤. 루트에 두면 모든 페이지가 Suspense 안에서 스트리밍돼 온디맨드 ISR의 notFound()가
// 404가 아닌 200(+noindex, 소프트 404)이 된다(docs: loading.js Status Codes) → (home) 그룹으로 범위 제한.
export default function Loading() {
  // 스켈레톤은 실제 홈 레이아웃(헤더 → 브리핑 → 급상승 보드 → 분야별 보드 세로 스택)을
  // 그대로 흉내 내 로딩 완료 시 레이아웃 점프(CLS)를 줄인다. 모바일 퍼스트 기준.
  const rowWidths = ["w-2/3", "w-1/2", "w-3/5"];
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* 스켈레톤은 빈 박스라 스크린리더엔 침묵으로 들린다. 로딩 상태를 별도로 알린다. */}
      <p role="status" className="sr-only">오늘의 키워드를 불러오는 중…</p>

      {/* 헤더(로고 자리) */}
      <div aria-hidden="true" className="border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90">
        <div className="mx-auto max-w-lg lg:max-w-2xl px-4 py-2.5 flex justify-center animate-pulse">
          <div className="h-6 w-24 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>

      <div aria-hidden="true" className="mx-auto max-w-lg lg:max-w-2xl px-4 py-4 animate-pulse">
        {/* 오늘의 브리핑 카드 */}
        <div className="mb-6 rounded-2xl border border-orange-200 dark:border-orange-900/50 bg-orange-50/40 dark:bg-orange-950/20 p-4">
          <div className="mb-3 h-3.5 w-24 rounded bg-orange-200/70 dark:bg-orange-900/40" />
          <div className="space-y-2">
            <div className="h-3.5 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3.5 w-11/12 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3.5 w-4/5 rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>

        {/* 급상승 히어로 보드: 헤더 + 하나의 분할 카드(리드 행 + 컴팩트 행들) */}
        <div className="mb-8">
          <div className="mb-2.5 flex items-center gap-2">
            <div className="h-4 w-1 shrink-0 rounded-full bg-orange-300 dark:bg-orange-800" />
            <div className="h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800/60">
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="h-6 w-6 shrink-0 rounded-md bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-5 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>
            {rowWidths.map((w, i) => (
              <div key={i} className="flex items-center gap-3.5 px-4 py-3">
                <div className="h-6 w-6 shrink-0 rounded-md bg-zinc-200 dark:bg-zinc-800" />
                <div className={`h-4 rounded bg-zinc-200 dark:bg-zinc-800 ${w}`} />
              </div>
            ))}
          </div>
        </div>

        {/* 분야별 보드: 세로 스택(경제/연예 등) */}
        <div className="flex flex-col gap-5">
          {[0, 1].map((board) => (
            <div key={board}>
              <div className="mb-2.5 flex items-center gap-2">
                <div className="h-3.5 w-1 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <div className="h-3.5 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {rowWidths.map((w, i) => (
                  <div key={i} className="flex items-center gap-3.5 px-4 py-3">
                    <div className="h-6 w-6 shrink-0 rounded-md bg-zinc-200 dark:bg-zinc-800" />
                    <div className={`h-4 rounded bg-zinc-200 dark:bg-zinc-800 ${w}`} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
