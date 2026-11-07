"""수집 직후 새 페이지 주소를 IndexNow로 검색엔진(네이버·Bing 등)에 알린다.

뉴스 키워드 페이지는 하루 이틀 지나면 검색 수요가 사라지므로, 크롤러가 사이트맵을
다시 읽을 때까지 기다리지 않고 바로 알려 색인을 앞당긴다.
Vercel 재배포가 끝나 새 페이지가 실제로 열린 뒤에 핑해야 404를 알리지 않는다.
실패해도 수집 파이프라인을 깨지 않도록 항상 0으로 끝난다.
"""
import json
import time
import urllib.error
import urllib.parse
import urllib.request

SITE = "https://www.whatnewstoday.com"
HOST = "www.whatnewstoday.com"
KEY = "f1119a93b21d3b283ff452ffc4b3c939"  # public/{KEY}.txt 와 같아야 함
ENDPOINTS = [
    "https://searchadvisor.naver.com/indexnow",
    "https://api.indexnow.org/indexnow",  # Bing 등 참여 엔진에 공유됨
]
DEPLOY_WAIT_SEC = 900


def log(msg: str) -> None:
    print(f"[indexnow] {msg}", flush=True)


def collect_urls() -> list[str]:
    with open("data/keywords.json", encoding="utf-8") as f:
        data = json.load(f)
    with open("data/trends.json", encoding="utf-8") as f:
        has_page = json.load(f)["keywords"]  # 키워드 상세 페이지는 trends에 있는 단어만 생성됨

    urls = [f"{SITE}/", f"{SITE}/{data['date']}"]
    seen = set()
    for cat in data["categories"].values():
        for k in cat["keywords"]:
            w = k["word"]
            if w in has_page and w not in seen:
                seen.add(w)
                urls.append(f"{SITE}/keyword/{urllib.parse.quote(w)}")
    return urls


def is_live(url: str) -> bool:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "whatnews-indexnow"})
        return urllib.request.urlopen(req, timeout=20).status == 200
    except Exception:
        return False


def main() -> int:
    urls = collect_urls()
    # 날짜 페이지만 보면 저녁엔 아침 배포본으로 이미 열려 있어 새 키워드 페이지가 404인 채로 핑했다.
    # 알릴 페이지가 전부 열릴 때까지 기다린다(이미 열린 건 다시 확인하지 않음).
    pending = list(urls)
    deadline = time.time() + DEPLOY_WAIT_SEC
    while True:
        pending = [u for u in pending if not is_live(u)]
        if not pending:
            break
        if time.time() > deadline:
            log(f"배포 대기 시간 초과 — {len(pending)}개 미응답(예: {pending[0]}), 핑 건너뜀")
            return 0
        time.sleep(30)

    body = json.dumps({
        "host": HOST,
        "key": KEY,
        "keyLocation": f"{SITE}/{KEY}.txt",
        "urlList": urls,
    }).encode()
    for ep in ENDPOINTS:
        req = urllib.request.Request(ep, data=body, headers={"Content-Type": "application/json; charset=utf-8"})
        try:
            status = urllib.request.urlopen(req, timeout=30).status
            log(f"{ep} → {status} ({len(urls)}개 URL)")
        except urllib.error.HTTPError as e:
            log(f"{ep} → {e.code} {e.read().decode(errors='replace')[:200]}")
        except Exception as e:
            log(f"{ep} → 실패: {e}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
