"""Vercel serverless function — scrape movie data from a Filmweb URL."""

from http.server import BaseHTTPRequestHandler
import json
import re
from urllib.parse import parse_qs, urlparse, quote_plus

import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.5",
}

# ── helpers ──────────────────────────────────────────────────────

def _clean_title(raw):
    raw = re.split(r"\s*\|", raw)[0].strip()
    raw = re.sub(r"(\D)((?:19|20)\d{2})\s*$", r"\1", raw).strip()
    return raw


def _clean_desc(desc, title, original_title):
    desc = desc.replace("\\n", "\n").replace('\\"', '"')
    desc = re.sub(r"^Opis filmu\s+", "", desc, flags=re.IGNORECASE).strip()
    for t in [title, original_title]:
        if t and desc.startswith(t):
            desc = desc[len(t):].strip()
    for marker in ["opis dystrybutora", "opis użytkownika", "opis redakcji",
                    "opis wydawcy", "Zobacz wszystkie"]:
        idx = desc.lower().find(marker)
        if idx > 20:
            desc = desc[:idx].strip()
    desc = re.sub(r"^.{0,80}\(\d{4}\)\s*[^-]*?-\s*", "", desc).strip()
    return desc


def _deep_find(obj, key):
    if isinstance(obj, dict):
        if key in obj:
            return obj[key]
        for v in obj.values():
            r = _deep_find(v, key)
            if r:
                return r
    elif isinstance(obj, list):
        for item in obj:
            r = _deep_find(item, key)
            if r:
                return r
    return None


def _deep_find_all(obj, key):
    results = []
    if isinstance(obj, dict):
        if key in obj:
            results.append(obj[key])
        for v in obj.values():
            results.extend(_deep_find_all(v, key))
    elif isinstance(obj, list):
        for item in obj:
            results.extend(_deep_find_all(item, key))
    return results


def _is_junk(text):
    junk_markers = ["Premiery filmowe", "Najpopularniejsze", "Nadchodzące filmy",
                    "Nadchodzące gry", "Popularne programy", "online", "Premiery gier"]
    return sum(1 for m in junk_markers if m in text) >= 2


def _iso_duration_to_min(iso):
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?", iso)
    if m:
        total = int(m.group(1) or 0) * 60 + int(m.group(2) or 0)
        if total > 0:
            return str(total)
    return ""


def normalize_url(raw):
    raw = raw.strip()
    if raw.startswith("http"):
        return raw
    if not raw.startswith("/"):
        raw = "/" + raw
    return "https://www.filmweb.pl" + raw


# ── filmweb parser ───────────────────────────────────────────────

def parse_filmweb(url):
    resp = requests.get(url, headers=HEADERS, timeout=8)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    movie = {"title": "", "original_title": "", "year": "",
             "duration": "", "poster": "", "desc": "", "filmweb": url}

    # JSON-LD
    ld_tag = soup.find("script", type="application/ld+json")
    if ld_tag:
        try:
            ld = json.loads(ld_tag.string)
            if isinstance(ld, list):
                ld = next((x for x in ld if x.get("@type") == "Movie"), ld[0])
            movie["title"] = ld.get("name", "")
            movie["poster"] = ld.get("image", "")
            movie["original_title"] = ld.get("alternateName", "")
            for key in ("datePublished", "dateCreated"):
                val = ld.get(key, "")
                if val:
                    movie["year"] = val[:4]
                    break
        except (json.JSONDecodeError, StopIteration):
            pass

    # Original title fallbacks
    if not movie["original_title"]:
        for sel in ["[class*='originalTitle']", "[itemprop='alternateName']",
                     "[data-type='original-title']"]:
            el = soup.select_one(sel)
            if el and el.get_text(strip=True):
                movie["original_title"] = el.get_text(strip=True)
                break

    if not movie["original_title"]:
        nd_tag = soup.find("script", id="__NEXT_DATA__")
        if nd_tag:
            try:
                nd = json.loads(nd_tag.string)
                movie["original_title"] = _deep_find(nd, "originalTitle") or ""
            except json.JSONDecodeError:
                pass

    if not movie["original_title"]:
        m = re.search(r'"originalTitle"\s*:\s*"([^"]+)"', resp.text)
        if m:
            movie["original_title"] = m.group(1)

    # OG fallbacks
    if not movie["title"]:
        og = soup.find("meta", property="og:title")
        if og:
            movie["title"] = og["content"].split(" - ")[0].strip()
    if not movie["desc"]:
        og = soup.find("meta", property="og:description")
        if og:
            movie["desc"] = og["content"]
    if not movie["poster"]:
        og = soup.find("meta", property="og:image")
        if og:
            movie["poster"] = og["content"]
    if not movie["year"]:
        m = re.search(r"-(\d{4})-\d+", url)
        if m:
            movie["year"] = m.group(1)

    # Duration from Filmweb
    dur_el = soup.select_one("[class*='filmCoverSection__duration'], [itemprop='timeRequired']")
    if dur_el:
        dd = dur_el.get("data-duration", "")
        if dd and dd.isdigit():
            movie["duration"] = dd
        else:
            content = dur_el.get("content", "")
            if content:
                movie["duration"] = _iso_duration_to_min(content)
            if not movie["duration"]:
                txt = dur_el.get_text(strip=True)
                m = re.match(r"(\d+)\s*h\s*(\d+)\s*m", txt)
                if m:
                    movie["duration"] = str(int(m.group(1)) * 60 + int(m.group(2)))

    # Full description from /descs page
    full_desc = ""
    descs_url = url.rstrip("/") + "/descs"
    try:
        descs_resp = requests.get(descs_url, headers=HEADERS, timeout=5)
        if descs_resp.status_code == 200:
            descs_soup = BeautifulSoup(descs_resp.text, "html.parser")
            for sel in ["[class*='filmDesc']", "[class*='Description']",
                        "[class*='description']", "[class*='plotText']",
                        "[class*='plot']", "[class*='synopsis']",
                        "[itemprop='description']"]:
                for el in descs_soup.select(sel):
                    text = el.get_text(" ", strip=True)
                    if len(text) > len(full_desc) and len(text) > 50 and not _is_junk(text):
                        full_desc = text

            nd_descs = descs_soup.find("script", id="__NEXT_DATA__")
            if nd_descs:
                try:
                    nd = json.loads(nd_descs.string)
                    for key in ("plotDescription", "plotDescriptionFull", "plot",
                                "synopsis", "description", "fullDescription",
                                "content", "text", "body"):
                        for val in _deep_find_all(nd, key):
                            if isinstance(val, str) and len(val) > len(full_desc) and not _is_junk(val):
                                full_desc = val
                except json.JSONDecodeError:
                    pass
    except Exception:
        pass

    # HTML fallback for description
    if not full_desc:
        for sel in ["[class*='filmPosterSection__plot']", "[class*='plotText']",
                     "[itemprop='description']"]:
            el = soup.select_one(sel)
            if el:
                text = el.get_text(" ", strip=True)
                if len(text) > len(full_desc) and not _is_junk(text):
                    full_desc = text

    if len(full_desc) > len(movie["desc"]):
        movie["desc"] = full_desc

    movie["desc"] = _clean_desc(movie["desc"], movie["title"], movie.get("original_title", ""))
    movie["title"] = _clean_title(movie["title"])
    movie["original_title"] = _clean_title(movie["original_title"])
    if not movie["original_title"]:
        movie["original_title"] = movie["title"]

    # Duration fallback: Wikidata (short timeout)
    if not movie["duration"]:
        movie["duration"] = _wikidata_duration(movie["original_title"], movie["year"])

    del movie["original_title"]
    return movie


# ── wikidata duration (short timeout for serverless) ─────────────

def _wikidata_duration(title, year):
    if not title or not year:
        return ""
    safe_title = title.replace("\\", "\\\\").replace('"', '\\"')
    query = f"""
    SELECT ?duration WHERE {{
      ?film wdt:P31 wd:Q11424 .
      ?film wdt:P1476 ?origTitle .
      FILTER(LCASE(STR(?origTitle)) = LCASE("{safe_title}"))
      ?film wdt:P577 ?date .
      FILTER(YEAR(?date) = {year})
      ?film wdt:P2047 ?duration .
    }}
    LIMIT 1
    """
    try:
        r = requests.get(
            "https://query.wikidata.org/sparql",
            params={"query": query, "format": "json"},
            headers={"User-Agent": "FilmwebScraper/1.0 (hobby project)"},
            timeout=4,
        )
        r.raise_for_status()
        bindings = r.json().get("results", {}).get("bindings", [])
        if bindings:
            return str(int(float(bindings[0]["duration"]["value"])))
    except Exception:
        pass
    return ""


# ── Vercel handler ───────────────────────────────────────────────

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        url = query.get("url", [""])[0].strip()

        if not url:
            self._json(400, {"error": "Brak parametru ?url="})
            return

        url = normalize_url(url)
        if "filmweb.pl" not in url:
            self._json(400, {"error": "URL musi prowadzic do filmweb.pl"})
            return

        try:
            movie = parse_filmweb(url)
            self._json(200, movie)
        except requests.RequestException as e:
            self._json(502, {"error": f"Blad pobierania: {e}"})
        except Exception as e:
            self._json(500, {"error": f"Blad serwera: {e}"})

    def _json(self, code, data):
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))
