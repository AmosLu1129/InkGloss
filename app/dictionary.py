"""ECDICT 离线词典查询（含词形还原）。"""
import os
import sqlite3
import threading
from collections import OrderedDict

from .difficulty import word_core, zipf
from .store import DATA_DIR

DICT_PATH = os.path.join(DATA_DIR, "dict", "ecdict.db")

_lock = threading.RLock()
_conn = None
_table = "stardict"

_COLS = ("word", "phonetic", "definition", "translation", "pos", "collins",
         "oxford", "tag", "bnc", "frq", "exchange")

_cache = OrderedDict()
_CACHE_MAX = 800

TAGS = {"zk": "中考", "gk": "高考", "cet4": "CET-4", "cet6": "CET-6",
        "ky": "考研", "toefl": "TOEFL", "ielts": "IELTS", "gre": "GRE",
        "bnc": "BNC", "coca": "COCA"}


def available() -> bool:
    return os.path.exists(DICT_PATH)


def _db():
    global _conn, _table
    with _lock:
        if _conn is None:
            _conn = sqlite3.connect(DICT_PATH, check_same_thread=False)
            names = [r[0] for r in _conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
            if "stardict" not in names:
                for n in names:
                    try:
                        cols = [c[1] for c in _conn.execute(
                            f"PRAGMA table_info({n})").fetchall()]
                        if "word" in cols and "translation" in cols:
                            _table = n
                            break
                    except sqlite3.Error:
                        continue
        return _conn


def _raw_get(word):
    cols = ",".join(_COLS)
    try:
        row = _db().execute(
            f"SELECT {cols} FROM {_table} WHERE word=? COLLATE NOCASE LIMIT 1",
            (word,)).fetchone()
    except sqlite3.Error:
        return None
    return dict(zip(_COLS, row)) if row else None


def _has_meaning(e):
    return bool((e.get("translation") or "").strip()
                or (e.get("definition") or "").strip())


def _exchange_base(exchange):
    """ECDICT exchange 形如 'p:did/d:done/0:do'，其中 0: 指向原形。"""
    if not exchange:
        return None
    for part in exchange.split("/"):
        if part.startswith("0:"):
            return part[2:].strip()
    return None


def _lemma_candidates(w):
    """轻量词干还原候选（词典主还原路径是 exchange 字段，此处兜底）。"""
    wl = w.lower().strip()
    cands = []

    def add(x):
        if x and len(x) >= 2 and x not in cands:
            cands.append(x)

    for suf in ("'s", "’s"):
        if wl.endswith(suf):
            add(wl[:-2])
    if wl.endswith("'") or wl.endswith("’"):
        add(wl.rstrip("'’"))
    if wl.endswith("ies") and len(wl) > 4:
        add(wl[:-3] + "y")
    if wl.endswith("ied") and len(wl) > 4:
        add(wl[:-3] + "y")
    if wl.endswith("es"):
        add(wl[:-2])
        add(wl[:-1])
    if wl.endswith("s") and not wl.endswith("ss"):
        add(wl[:-1])
    if wl.endswith("ed"):
        add(wl[:-2])
        if len(wl) > 4 and wl[-3] == wl[-4]:
            add(wl[:-3])      # stopped -> stop
        add(wl[:-1])          # loved -> love
    if wl.endswith("ing"):
        add(wl[:-3])
        add(wl[:-3] + "e")    # making -> make
        if len(wl) > 5 and wl[-4] == wl[-5]:
            add(wl[:-4])      # running -> run
    if wl.endswith("ly"):
        add(wl[:-2])
        add(wl[:-2] + "e")    # truly -> true
    if wl.endswith("est"):
        add(wl[:-3])
        add(wl[:-2])
    if wl.endswith("er"):
        add(wl[:-2])
        add(wl[:-1])
    return cands


def _pack(query, entry):
    if entry is None or not _has_meaning(entry):
        return {"found": False, "query": query,
                "zipf": round(zipf(word_core(query)), 2)}
    tags = [TAGS[c] for c in (entry.get("tag") or "").split() if c in TAGS]
    return {
        "found": True,
        "query": query,
        "word": entry["word"],
        "phonetic": (entry.get("phonetic") or "").strip(),
        "translation": (entry.get("translation") or "").strip(),
        "definition": (entry.get("definition") or "").strip(),
        "pos": (entry.get("pos") or "").strip(),
        "collins": entry.get("collins") or 0,
        "oxford": entry.get("oxford") or 0,
        "tags": tags,
        "bnc": entry.get("bnc") or 0,
        "frq": entry.get("frq") or 0,
        "zipf": round(zipf(entry["word"]), 2),
        "source": "ecdict",
    }


def lookup(query):
    q = (query or "").strip().strip("“”‘’\"'`+*=|~#$%^&()[]<>?!.,;:")
    if not q:
        return None
    key = q.lower()
    if key in _cache:
        return _cache[key]

    with _lock:
        entry = _raw_get(q) or _raw_get(q.lower())
        if entry is None and len(q) > 1:
            entry = _raw_get(q.capitalize())
        # ECDICT 的变形词条释义为空，exchange 的 0: 指向原形
        if entry is not None and not _has_meaning(entry):
            base = _exchange_base(entry.get("exchange"))
            if base:
                e2 = _raw_get(base)
                if e2 is not None:
                    entry = e2
        # 词干还原兜底
        if entry is None or not _has_meaning(entry):
            for cand in _lemma_candidates(q):
                e2 = _raw_get(cand)
                if e2 is not None and _has_meaning(e2):
                    entry = e2
                    break

    result = _pack(q, entry)
    _cache[key] = result
    if len(_cache) > _CACHE_MAX:
        _cache.popitem(last=False)
    return result
