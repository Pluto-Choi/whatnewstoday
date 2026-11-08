#!/bin/sh
# Vercel ignoreCommand (vercel.json은 256자 제한이라 스크립트로 분리). exit 0 = 빌드 생략, exit 1 = 빌드.
# 사이트 코드가 바뀐 커밋만 빌드. data/는 런타임에 GitHub에서 읽고 /api/revalidate로 갱신하므로 빌드 대상이 아니다.
[ "$VERCEL_GIT_PREVIOUS_SHA" = "$VERCEL_GIT_COMMIT_SHA" ] && exit 1
git diff --quiet "${VERCEL_GIT_PREVIOUS_SHA:-HEAD^}" HEAD -- app public package.json package-lock.json next.config.ts tsconfig.json postcss.config.mjs vercel.json vercel-ignore.sh || exit 1
