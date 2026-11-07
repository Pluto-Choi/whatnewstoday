"""
Threads 자동 게시 스크립트.

키워드 수집(collect.py) 직후 실행되어 data/keywords.json의 오늘 키워드를
운영 Threads 계정에 게시한다.

게시물 = 이슈 1개 집중. 아침(KST 12시 전)은 오늘의 이슈 1위, 저녁은 나머지
분야 중 가장 화제인 1위. 헤드라인 + 궁금증을 남기는 한 줄 + 키워드 페이지 링크.
(헤드라인을 여러 개 나열하면 피드에서 궁금증이 다 풀려 클릭이 0이었음)

환경변수:
  THREADS_USER_ID       - Threads 사용자 ID (숫자)
  THREADS_ACCESS_TOKEN  - 장기 액세스 토큰
  ANTHROPIC_API_KEY     - 훅 한 줄 생성용(없거나 실패하면 훅 없이 게시)

둘 중 하나라도 없으면 조용히 건너뛴다(파이프라인을 깨지 않음).
push 뒤에 실행된다: 새 키워드 페이지는 재배포 전까지 404라 링크 첨부가 실패하므로,
페이지가 열릴 때까지 기다렸다 게시한다. 게시 실패 시 1회 재시도하고, 그래도 실패하면
종료 코드 1로 끝내 실패가 Actions에 드러나게 한다(예전엔 조용히 성공으로 떴음).
직전 게시와 내용이 동일하면(키워드 변동 없음) 중복 게시를 건너뛴다.
"""

import hashlib
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
import urllib.error
import urllib.parse
import urllib.request

API = "https://graph.threads.net/v1.0"
SITE = "https://www.whatnewstoday.com"
DATA_PATH = "data/keywords.json"
STATE_PATH = "data/threads_state.json"
TEXT_LIMIT = 490  # Threads 본문 한도 500자보다 여유
DEPLOY_WAIT_SEC = 900  # 재배포 반영 대기 한도
RETRY_WAIT_SEC = 60

HERO_CATEGORY = "오늘의 이슈"
CAT_EMOJI = {"오늘의 이슈": "🔥", "경제": "💰", "연예": "🎤", "스포츠": "⚽"}
CAT_ORDER = ["오늘의 이슈", "경제", "연예", "스포츠"]


def log(msg: str) -> None:
    print(f"[threads] {msg}", flush=True)


def pick_keyword(data: dict, kst_hour: int) -> tuple[str, dict] | None:
    """아침엔 오늘의 이슈 1위, 저녁엔 다른 분야 1위 중 관련 기사가 가장 많은 것."""
    cats = data.get("categories", {})
    if kst_hour < 12:
        names = [HERO_CATEGORY]
    else:
        names = sorted(
            (n for n in CAT_ORDER if n != HERO_CATEGORY and cats.get(n, {}).get("keywords")),
            key=lambda n: -cats[n]["keywords"][0].get("count", 0),
        ) or [HERO_CATEGORY]
    for name in names:
        kws = cats.get(name, {}).get("keywords", [])
        if kws and kws[0].get("word"):
            return name, kws[0]
    return None


def make_hook(headline: str, description: str) -> str:
    """요약(우리 AI 요약)에 있는 사실 하나로 궁금증을 남기는 한 줄. 실패 시 빈 문자열."""
    if not description or not os.environ.get("ANTHROPIC_API_KEY"):
        return ""
    try:
        import anthropic

        msg = anthropic.Anthropic().messages.create(
            model="claude-sonnet-4-6",
            max_tokens=100,
            messages=[{"role": "user", "content": (
                "뉴스 헤드라인과 요약이 있다. 요약에서 헤드라인에 없는 사실 하나를 골라, "
                "읽는 사람이 '무슨 일이지?' 하고 궁금해지게 만드는 한국어 한 문장을 써라.\n"
                "규칙: 요약에 있는 사실만 쓴다(추측·과장·창작 금지). 40자 이내. "
                "'~했다는데…' 같은 구어체로 끝낸다. 결론·이유는 밝히지 않는다. 문장만 출력.\n\n"
                f"헤드라인: {headline}\n요약: {description}"
            )}],
        )
        hook = msg.content[0].text.strip().strip('"').splitlines()[0].strip()
    except Exception as e:  # noqa: BLE001 - 훅은 선택 요소
        log(f"훅 생성 실패 → 훅 없이 게시: {e}")
        return ""
    if not hook or len(hook) > 60 or "http" in hook:
        return ""
    return hook


def keyword_url(k: dict) -> str:
    return f"{SITE}/keyword/{urllib.parse.quote(k['word'].strip())}"


def wait_until_live(url: str) -> bool:
    deadline = time.time() + DEPLOY_WAIT_SEC
    while True:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "whatnews-threads"})
            if urllib.request.urlopen(req, timeout=20).status == 200:
                return True
        except Exception:  # noqa: BLE001 - 404/타임아웃 모두 '아직 안 열림'
            pass
        if time.time() > deadline:
            return False
        time.sleep(30)


def build_text(category: str, k: dict, hook: str) -> str:
    word = k["word"].strip()
    headline = (k.get("headline") or "").strip() or word
    url = keyword_url(k)
    lines = [f"{CAT_EMOJI.get(category, '🔥')} 지금 가장 많이 찾는 뉴스", "", headline]
    if hook:
        lines.append(hook)
    lines += ["", "무슨 일이 있었는지 정리했어요 👇", url, "", f"#{word.replace(' ', '')}"]
    text = "\n".join(lines)
    return text[: TEXT_LIMIT - 3] + "..." if len(text) > TEXT_LIMIT else text


def _post_json(url: str, params: dict) -> dict:
    body = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(url, data=body, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def publish(user_id: str, token: str, text: str) -> str:
    # 1) 컨테이너 생성
    creation = _post_json(
        f"{API}/{user_id}/threads",
        {"media_type": "TEXT", "text": text, "access_token": token},
    )
    creation_id = creation["id"]
    # 서버 처리 시간 권장 (Meta 문서: 발행 전 약간의 대기)
    time.sleep(3)
    # 2) 발행
    result = _post_json(
        f"{API}/{user_id}/threads_publish",
        {"creation_id": creation_id, "access_token": token},
    )
    return result["id"]


def load_state() -> dict:
    try:
        with open(STATE_PATH, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def save_state(state: dict) -> None:
    with open(STATE_PATH, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def main() -> int:
    token = os.environ.get("THREADS_ACCESS_TOKEN")
    user_id = os.environ.get("THREADS_USER_ID")
    if not token or not user_id:
        log("THREADS_ACCESS_TOKEN / THREADS_USER_ID 미설정 → 게시 건너뜀")
        return 0

    try:
        with open(DATA_PATH, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, ValueError) as e:
        log(f"keywords.json 로드 실패 → 건너뜀: {e}")
        return 0

    kst_hour = datetime.now(timezone(timedelta(hours=9))).hour
    picked = pick_keyword(data, kst_hour)
    if not picked:
        log("게시할 키워드 없음 → 건너뜀")
        return 0
    category, k = picked

    # 중복 판단은 문구(훅은 매번 달라짐)가 아니라 날짜+키워드로 한다.
    signature = hashlib.sha256(f"{data.get('date', '')}|{k['word']}".encode()).hexdigest()
    state = load_state()
    if state.get("last_signature") == signature:
        log("직전 게시와 같은 날짜·키워드 → 중복 게시 건너뜀")
        return 0

    text = build_text(category, k, make_hook(k.get("headline", ""), k.get("description", "")))

    url = keyword_url(k)
    if not wait_until_live(url):
        log(f"::error:: {DEPLOY_WAIT_SEC}초 기다려도 키워드 페이지가 안 열림 → 게시 안 함: {url}")
        return 1

    post_id = None
    for attempt in (1, 2):
        try:
            post_id = publish(user_id, token, text)
            log(f"게시 완료 id={post_id}")
            break
        except urllib.error.HTTPError as e:
            log(f"게시 실패 {attempt}/2 (HTTP {e.code}): {e.read().decode()[:300]}")
        except Exception as e:  # noqa: BLE001
            log(f"게시 실패 {attempt}/2: {e}")
        if attempt == 1:
            time.sleep(RETRY_WAIT_SEC)
    if post_id is None:
        log("::error:: Threads 게시 2회 모두 실패")
        return 1

    save_state(
        {
            "last_signature": signature,
            "last_posted_date": data.get("date", ""),
            "last_post_id": post_id,
        }
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
