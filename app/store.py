"""SQLite 存储：书库、生词本、译文缓存、设置。"""
import json
import os
import sqlite3
import threading
import time

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
BOOKS_DIR = os.path.join(DATA_DIR, "books")
DB_PATH = os.path.join(DATA_DIR, "app.db")

for _d in (DATA_DIR, BOOKS_DIR):
    os.makedirs(_d, exist_ok=True)

DEFAULT_SETTINGS = {
    "model_id": "Helsinki-NLP/opus-mt-en-zh",
    "smart_mode": False,          # 智能模式总开关（默认全手动）
    "underline_rare": True,       # 生词下划线
    "auto_translate_hard": True,  # 长难句自动预译
    "rare_zipf": 3.55,            # zipf 词频低于此值 -> 生词
    "hard_len": 28,               # 句子词数达到此值 -> 长难句
    "font_size": 19,
}

SETTINGS_KEYS = set(DEFAULT_SETTINGS.keys())

_lock = threading.RLock()
_conn = None


def conn():
    global _conn
    with _lock:
        if _conn is None:
            _conn = sqlite3.connect(DB_PATH, check_same_thread=False)
            _conn.execute("PRAGMA journal_mode=WAL")
            _conn.executescript("""
            CREATE TABLE IF NOT EXISTS books(
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              title TEXT NOT NULL,
              path TEXT NOT NULL,
              kind TEXT NOT NULL,
              pages INTEGER DEFAULT 0,
              added REAL DEFAULT 0,
              last_loc TEXT DEFAULT '{}');
            CREATE TABLE IF NOT EXISTS vocab(
              word TEXT PRIMARY KEY,
              phonetic TEXT DEFAULT '',
              translation TEXT DEFAULT '',
              context TEXT DEFAULT '',
              book TEXT DEFAULT '',
              added REAL DEFAULT 0);
            CREATE TABLE IF NOT EXISTS trans_cache(
              src TEXT PRIMARY KEY,
              dst TEXT DEFAULT '',
              model TEXT DEFAULT '',
              created REAL DEFAULT 0);
            CREATE TABLE IF NOT EXISTS settings(
              key TEXT PRIMARY KEY,
              value TEXT DEFAULT '');
            """)
            _conn.commit()
        return _conn


# ---------------- 书库 ----------------

def add_book(title, path, kind, pages):
    with _lock:
        c = conn()
        cur = c.execute(
            "INSERT INTO books(title,path,kind,pages,added,last_loc) VALUES(?,?,?,?,?,?)",
            (title, path, kind, pages, time.time(), "{}"))
        c.commit()
        return cur.lastrowid


def get_book(bid):
    with _lock:
        row = conn().execute(
            "SELECT id,title,path,kind,pages,added,last_loc FROM books WHERE id=?",
            (bid,)).fetchone()
    if not row:
        return None
    return {"id": row[0], "title": row[1], "path": row[2], "kind": row[3],
            "pages": row[4], "added": row[5],
            "loc": json.loads(row[6] or "{}")}


def list_books():
    with _lock:
        rows = conn().execute(
            "SELECT id,title,path,kind,pages,added,last_loc FROM books ORDER BY id").fetchall()
    out = []
    for r in rows:
        out.append({"id": r[0], "title": r[1], "path": r[2], "kind": r[3],
                    "pages": r[4], "added": r[5], "loc": json.loads(r[6] or "{}")})
    return out


def del_book(bid):
    book = get_book(bid)
    if not book:
        return False
    path = book["path"]
    # 只删除复制进数据目录的文件，用户通过路径打开的原文件保留
    if os.path.commonpath([os.path.abspath(path), BOOKS_DIR]) == BOOKS_DIR:
        try:
            os.remove(path)
        except OSError:
            pass
    with _lock:
        conn().execute("DELETE FROM books WHERE id=?", (bid,))
        conn().commit()
    return True


def save_progress(bid, loc: dict):
    with _lock:
        conn().execute("UPDATE books SET last_loc=? WHERE id=?",
                       (json.dumps(loc, ensure_ascii=False), bid))
        conn().commit()


# ---------------- 生词本 ----------------

def vocab_add(word, phonetic="", translation="", context="", book=""):
    word = word.strip().lower()
    if not word:
        return False
    with _lock:
        c = conn()
        cur = c.execute("SELECT added FROM vocab WHERE word=?", (word,)).fetchone()
        c.execute(
            "INSERT INTO vocab(word,phonetic,translation,context,book,added) VALUES(?,?,?,?,?,?) "
            "ON CONFLICT(word) DO UPDATE SET phonetic=excluded.phonetic,"
            "translation=excluded.translation,context=excluded.context,book=excluded.book",
            (word, phonetic, translation, context, book,
             cur[0] if cur else time.time()))
        c.commit()
    return True


def vocab_list():
    with _lock:
        rows = conn().execute(
            "SELECT word,phonetic,translation,context,book,added FROM vocab "
            "ORDER BY added DESC").fetchall()
    return [{"word": r[0], "phonetic": r[1], "translation": r[2],
             "context": r[3], "book": r[4], "added": r[5]} for r in rows]


def vocab_del(word):
    with _lock:
        conn().execute("DELETE FROM vocab WHERE word=?", (word,))
        conn().commit()


def vocab_count():
    with _lock:
        return conn().execute("SELECT COUNT(*) FROM vocab").fetchone()[0]


# ---------------- 译文缓存 ----------------

def norm_src(text: str) -> str:
    return " ".join(text.split()).lower()


def cache_get(src):
    key = norm_src(src)
    with _lock:
        row = conn().execute("SELECT dst FROM trans_cache WHERE src=?", (key,)).fetchone()
    return row[0] if row else None


def cache_put(src, dst, model=""):
    key = norm_src(src)
    with _lock:
        c = conn()
        c.execute("INSERT OR REPLACE INTO trans_cache(src,dst,model,created) VALUES(?,?,?,?)",
                  (key, dst, model, time.time()))
        c.commit()


# ---------------- 设置 ----------------

def get_settings() -> dict:
    merged = dict(DEFAULT_SETTINGS)
    with _lock:
        rows = conn().execute("SELECT key,value FROM settings").fetchall()
    for k, v in rows:
        if k in SETTINGS_KEYS:
            try:
                merged[k] = json.loads(v)
            except (ValueError, TypeError):
                pass
    return merged


def update_settings(patch: dict) -> dict:
    cur = get_settings()
    with _lock:
        c = conn()
        for k, v in patch.items():
            if k not in SETTINGS_KEYS:
                continue
            if k == "model_id":
                if not isinstance(v, str) or not v.strip():
                    continue
            cur[k] = v
            c.execute("INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)",
                      (k, json.dumps(v, ensure_ascii=False)))
        c.commit()
    return cur
