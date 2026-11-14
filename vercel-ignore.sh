#!/bin/sh
# Vercel ignoreCommand (vercel.json은 256자 제한이라 스크립트로 분리). exit 0 = 빌드 생략, exit 1 = 빌드.
# 사이트에 영향 있는 경로가 바뀐 커밋만 빌드. threads_state.json(Threads 중복게시 방지 상태)만 바뀐 커밋은 생략.
[ "$VERCEL_GIT_PREVIOUS_SHA" = "$VERCEL_GIT_COMMIT_SHA" ] && exit 1
# 직전 키워드 배포가 아직 빌드 중이면 PREVIOUS_SHA가 더 옛날 커밋이라 아래 diff에 키워드 변경이 섞여 빌드됨 → 이 커밋 자체가 threads_state만 바꿨으면 바로 생략.
[ "$(git diff --name-only HEAD^ HEAD 2>/dev/null)" = "data/threads_state.json" ] && exit 0
git diff --quiet "${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}" HEAD -- app data public package.json package-lock.json next.config.ts tsconfig.json postcss.config.mjs vercel.json vercel-ignore.sh ':!data/threads_state.json' || exit 1
