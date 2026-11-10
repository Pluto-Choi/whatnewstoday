# 왓뉴스 (What News Today)

**지금 한국에서 가장 화제인 뉴스 키워드**를 매일 자동으로 수집·정제해 보여주는 모바일 퍼스트 웹 서비스.

- 서비스: https://www.whatnewstoday.com
- 배포: Vercel (커스텀 도메인, `www` primary)
- 갱신: 매일 **아침·저녁 2회** 자동 수집 → 커밋 → 재배포

---

## 무엇을 하는가

Google News RSS에서 그날 한국에서 많이 다뤄진 키워드를 뽑아, **카테고리별 급상승 키워드 · 순위 추이 · 오늘의 브리핑**으로 정리한다. 각 키워드는 관련 기사 원문 링크로 연결되고, 며칠째 화제인지(연속기록)·순위가 어떻게 변했는지 시계열로 보여준다.

핵심 원칙: **원문을 대체하지 않고 원문으로 보낸다.** 요약·설명은 진입 관문이고, 실제 소비는 출처 기사에서 이뤄지도록 설계한다. (→ `COPYRIGHT_GUIDELINES.md`)

### 주요 화면·기능
- **급상승 키워드** — 카테고리(오늘의 이슈 / 경제 / 연예 / 스포츠)별 상위 키워드 + 순위 변동 뱃지(NEW·▲·▼)
- **키워드 상세** (`/keyword/[term]`) — 순위 추이, 등장 일수, 최고 순위, 관련 기사, AI 소제목 본문
- **날짜별 아카이브** (`/[date]`) — 과거 특정 날짜의 키워드 스냅샷
- **트렌드** (`/trends`) — 연속 등장 기록(streak) 30/90/180/365일 랭킹
- **오늘의 브리핑** — 전 카테고리 상위 키워드를 묶은 종합 요약
- PWA(홈 추가) · 다크모드 · 소셜 공유(동적 OG 이미지) · 카카오 애드핏

---

## 기술 스택

### 프런트엔드 (`app/`)
- **Next.js 16** (App Router) · **React 19** · **TypeScript** · **Tailwind CSS 4**
- **완전 정적 생성(SSG)** — 모든 페이지 `generateStaticParams` + `force-static`. 데이터는 배포 시점 고정, 런타임은 CDN 캐시로 서빙.
- 분석: Vercel Analytics · Speed Insights · GA4(`@next/third-parties`) · Search Console
- 데이터 로더(`app/data.ts`)는 파일별 프로세스 전역 메모이즈로 빌드 시 중복 파싱 제거.

### 데이터 파이프라인 (`collect.py`, Python)
1. **수집** — `feedparser`로 Google News RSS 파싱 (카테고리별 피드: 이슈=메인, 경제=BUSINESS, 연예=ENTERTAINMENT, 스포츠=SPORTS)
2. **키워드 추출** — `kiwipiepy`(Kiwi) 형태소 분석 기반 빈도 신호 + **modu-NER**(HuggingFace `transformers`) 개체명 보강(hybrid). stopwords 필터 + 분산도 검사 + 조각어 병합으로 정제.
3. **기사 재수집** — 키워드별 `news.google.com/rss/search?when=1d`로 관련 기사(제목·링크·출처) 수집
4. **AI 가공** — Anthropic **Claude Sonnet**(`claude-sonnet-4-6`)으로 카테고리 요약 · 키워드 헤드라인/설명(순위변동 반영) · 오늘의 브리핑 생성
5. **집계** — history 스냅샷 저장 → 순위 시계열(trends) 집계 → 연속기록(streak) 계산 + AI 요약
6. **커밋 → Vercel 재배포**

### 자동화 (GitHub Actions, `.github/workflows/`)
- `collect.yml` — **06:00 / 17:30 KST** 하루 2회 수집
- `threads-refresh.yml` — 매월 1일(Threads 토큰 갱신)

### 저장소
- **정식 DB 없음** — `data/`의 JSON 파일이 데이터 저장소 역할

---

## 로컬 개발

```bash
npm run dev            # 개발 서버 (http://localhost:3000)
npm run lint           # ESLint

# 로컬 빌드는 한글 폴더명 때문에 Turbopack이 깨져 webpack으로 실행
npx next build --webpack
```

데이터 파이프라인:
```bash
python collect.py      # 수집·집계 (ANTHROPIC_API_KEY 필요)
```

---

## 디렉터리 개요

```
app/                  Next.js App Router (페이지·컴포넌트·API·데이터 로더)
  api/                today(정적 JSON) · subscribe(웹푸시)
  data.ts             JSON 로더 (프로세스 전역 메모이즈)
  lib/og.tsx          동적 OG 이미지 생성
collect.py            수집·NLP·AI 가공 파이프라인
data/                 keywords / history / trends / sections (JSON = DB)
.github/workflows/    수집·푸시 자동화
```
