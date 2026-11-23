"""FastAPI 入口：书库 / 页面 / 查词 / 翻译 / 生词本 / 设置。"""
import csv
import io
import os
import re
import subprocess
import time
from collections import OrderedDict

from fastapi import Body, FastAPI, File, HTTPException, UploadFile
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles

from . import difficulty, extract, store
from .dictionary import available as dict_available
from .dictionary import lookup as dict_lookup
from .translator import ModelNotReady, translator

app = FastAPI(title="自动翻译阅读器", docs_url=None, redoc_url=None)

# ---------------- 内存缓存 ----------------
_page_cache = OrderedDict()   # (bid, page) -> payload
_paras_cache = {}             # bid -> (mtime, paras)
_cover_cache = {}             # bid -> dataURL / ""
_PAGE_CACHE_MAX = 12


def _clear_caches(bid=None):
    if bid is None:
        _page_cache.clear()
        _paras_cache.clear()
        _cover_cache.clear()
        return
    for k in [k for k in _page_cache if k[0] == bid]:
        _page_cache.pop(k, None)
    _paras_cache.pop(bid, None)
    _cover_cache.pop(bid, None)


def _settings():
    return store.get_settings()


def _get_book(bid):
    book = store.get_book(bid)
    if not book:
        raise HTTPException(404, "书籍不存在")
    return book


def _unique_book_path(filename):
    base, ext = os.path.splitext(filename)
    base = re.sub(r'[\\/:*?"<>|]', "_", base).strip(". ")[:60] or "book"
    p = os.path.join(store.BOOKS_DIR, base + ext)
    i = 1
    while os.path.exists(p):
        p = os.path.join(store.BOOKS_DIR, f"{base} ({i}){ext}")
        i += 1
    return p


def _register(path, title=None):
    ext = os.path.splitext(path)[1].lower()
    if ext not in (".pdf", ".txt"):
        raise HTTPException(400, "仅支持带文字层的 PDF 或 TXT 文件")
    kind = ext[1:]
    title = title or os.path.splitext(os.path.basename(path))[0]
    if kind == "pdf":
        if not extract.pdf_has_text_layer(path):
            raise HTTPException(400, "这本 PDF 没有文字层（扫描版），请先用 OCR 工具处理后导入")
        pages = extract.pdf_page_count(path)
    else:
        pages = extract.txt_chunk_count(extract.txt_paragraphs(path))
    bid = store.add_book(title, path, kind, pages)
    return store.get_book(bid)


# ---------------- 状态 ----------------

@app.get("/api/status")
def api_status():
    st = translator.status()
    st["dict_ready"] = dict_available()
    st["vocab_count"] = store.vocab_count()
    return st


# ---------------- 书库 ----------------

@app.get("/api/books")
def api_books():
    out = []
    for b in store.list_books():
        item = dict(b)
        if b["kind"] == "pdf":
            cov = _cover_cache.get(b["id"])
            if cov is None:
                cov = ""
                if os.path.exists(b["path"]):
                    try:
                        cov = extract.pdf_cover(b["path"])
                    except Exception:
                        cov = ""
                _cover_cache[b["id"]] = cov
            item["cover"] = cov
        loc = b["loc"] or {}
        pages = max(1, b["pages"] or 1)
        cur = loc.get("page") or loc.get("chunk") or 0
        item["percent"] = min(100, int(100 * cur / pages))
        out.append(item)
    return out


@app.post("/api/books/upload")
def api_upload(file: UploadFile = File(...)):
    fname = file.filename or "book.txt"
    ext = os.path.splitext(fname)[1].lower()
    if ext not in (".pdf", ".txt"):
        raise HTTPException(400, "仅支持 .pdf / .txt 文件")
    data = file.file.read()
    if not data:
        raise HTTPException(400, "文件为空")
    path = _unique_book_path(fname)
    with open(path, "wb") as f:
        f.write(data)
    try:
        book = _register(path, os.path.splitext(fname)[0])
    except HTTPException:
        try:
            os.remove(path)
        except OSError:
            pass
        raise
    _clear_caches(book["id"])
    return book


@app.post("/api/books/path")
def api_open_path(path: str = Body(..., embed=True)):
    path = (path or "").strip().strip('"')
    if not os.path.exists(path):
        raise HTTPException(400, f"文件不存在：{path}")
    return _register(os.path.abspath(path))


@app.get("/api/books/{bid}")
def api_book(bid: int):
    return _get_book(bid)


@app.delete("/api/books/{bid}")
def api_book_del(bid: int):
    if not store.del_book(bid):
        raise HTTPException(404, "书籍不存在")
    _clear_caches(bid)
    return {"ok": True}


# ---------------- 阅读 ----------------

@app.get("/api/books/{bid}/page/{page_no}")
def api_book_page(bid: int, page_no: int):
    book = _get_book(bid)
    if book["kind"] != "pdf":
        raise HTTPException(400, "该书不是 PDF")
    if not os.path.exists(book["path"]):
        raise HTTPException(400, "书籍文件已被移动或删除")
    key = (bid, page_no)
    hit = _page_cache.get(key)
    if hit is None:
        hit = extract.pdf_page_payload(book["path"], page_no, _settings())
        _page_cache[key] = hit
        if len(_page_cache) > _PAGE_CACHE_MAX:
            _page_cache.popitem(last=False)
    else:
        _page_cache.move_to_end(key)
    return hit


@app.get("/api/books/{bid}/text")
def api_book_text(bid: int, chunk: int = 0):
    book = _get_book(bid)
    if book["kind"] != "txt":
        raise HTTPException(400, "该书不是 TXT")
    if not os.path.exists(book["path"]):
        raise HTTPException(400, "书籍文件已被移动或删除")
    mtime = os.path.getmtime(book["path"])
    hit = _paras_cache.get(bid)
    if hit and hit[0] == mtime:
        paras = hit[1]
    else:
        paras = extract.txt_paragraphs(book["path"])
        _paras_cache[bid] = (mtime, paras)
    return extract.txt_chunk_payload(paras, chunk, _settings())


@app.post("/api/progress")
def api_progress(book_id: int = Body(...), loc: dict = Body(...)):
    _get_book(book_id)
    store.save_progress(book_id, loc)
    return {"ok": True}


# ---------------- 查词 / 翻译 ----------------

@app.post("/api/lookup")
def api_lookup(word: str = Body(..., embed=True)):
    word = (word or "")[:80].strip()
    if not word:
        raise HTTPException(400, "空单词")
    entry = dict_lookup(word) if dict_available() else None
    if not entry or not entry.get("found"):
        return {"found": False, "query": word,
                "zipf": round(difficulty.zipf(difficulty.word_core(word)), 2)}
    return entry


@app.post("/api/translate")
def api_translate(text: str = Body(..., embed=True)):
    text = (text or "").strip()[:1200]
    if not text:
        raise HTTPException(400, "空文本")
    try:
        return translator.translate(text)
    except ModelNotReady:
        raise HTTPException(503, "翻译模型正在加载，请稍候几秒后重试")


@app.post("/api/tts")
def api_tts(word: str = Body(..., embed=True)):
    """用 Windows 自带语音读单词（无声卡/无英文语音包时静默失败）。"""
    w = re.sub(r"[^A-Za-z0-9 '\-]", "", word)[:60].strip()
    if not w:
        return {"ok": False}
    try:
        subprocess.Popen(
            ["powershell", "-NoProfile", "-Command",
             "Add-Type -AssemblyName System.Speech;"
             "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer;"
             f'$s.Speak("{w}")'],
            creationflags=subprocess.CREATE_NO_WINDOW)
        return {"ok": True}
    except Exception:
        return {"ok": False}


# ---------------- 生词本 ----------------

@app.get("/api/vocab")
def api_vocab():
    return store.vocab_list()


@app.post("/api/vocab")
def api_vocab_add(word: str = Body(...), phonetic: str = Body(""),
                  translation: str = Body(""), context: str = Body(""),
                  book: str = Body("")):
    ok = store.vocab_add(word, phonetic, translation, context, book)
    return {"ok": ok}


@app.delete("/api/vocab/{word}")
def api_vocab_del(word: str):
    store.vocab_del(word)
    return {"ok": True}


@app.get("/api/vocab/export.csv")
def api_vocab_export():
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["word", "phonetic", "translation", "context", "book", "added"])
    for r in store.vocab_list():
        w.writerow([r["word"], r["phonetic"], r["translation"], r["context"],
                    r["book"], time.strftime("%Y-%m-%d %H:%M", time.localtime(r["added"]))])
    data = "\ufeff" + buf.getvalue()
    return Response(content=data, media_type="text/csv; charset=utf-8",
                    headers={"Content-Disposition":
                             "attachment; filename=vocab_export.csv"})


# ---------------- 设置 ----------------

@app.get("/api/settings")
def api_settings():
    return _settings()


@app.put("/api/settings")
def api_settings_put(patch: dict = Body(...)):
    merged = store.update_settings(patch)
    _page_cache.clear()
    return merged


# 静态前端（放在最后，不遮挡 /api 路由）
translator.ensure_loading()
app.mount("/", StaticFiles(directory=os.path.join(
    os.path.dirname(__file__), "static"), html=True), name="static")
