"""书籍文本提取：PDF 页面（图 + 单词坐标层）、TXT 段落。"""
import base64
import math
import re

import pymupdf as fitz

from . import difficulty
from .nlp import build_sentences, ends_sentence, join_sentence, tokenize

# PDF 渲染目标宽度（px），自适应 zoom
TARGET_WIDTH = 1050


def pdf_page_count(path):
    doc = fitz.open(path)
    n = doc.page_count
    doc.close()
    return n


def pdf_has_text_layer(path, sample=6):
    """抽样前几页，判断是否带文字层（防扫描版）。"""
    doc = fitz.open(path)
    total = 0
    for i in range(min(sample, doc.page_count)):
        total += len(doc[i].get_text("words"))
    doc.close()
    return total >= 20


def pdf_cover(path):
    """第 1 页小图，用于书库封面。"""
    doc = fitz.open(path)
    try:
        pix = doc[0].get_pixmap(matrix=fitz.Matrix(0.45, 0.45), alpha=False)
        return "data:image/png;base64," + base64.b64encode(pix.tobytes("png")).decode("ascii")
    finally:
        doc.close()


def pdf_page_payload(path, page_no, settings):
    """page_no 从 1 开始。返回页面图 + 单词（含句号、生词标记）+ 句子列表。"""
    doc = fitz.open(path)
    try:
        n = min(max(page_no, 1), doc.page_count) - 1
        page = doc[n]
        W, H = page.rect.width, page.rect.height
        zoom = min(2.2, max(1.3, TARGET_WIDTH / W))
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
        img = "data:image/png;base64," + base64.b64encode(pix.tobytes("png")).decode("ascii")

        words = []
        for r in page.get_text("words"):
            t = r[4].strip()
            if not t:
                continue
            x0, y0, x1, y1 = r[0], r[1], r[2], r[3]
            pad = 0.5
            words.append({
                "i": len(words), "t": t, "s": -1,
                "x": max(0.0, (x0 - pad) / W), "y": max(0.0, (y0 - pad) / H),
                "w": (x1 - x0 + 2 * pad) / W, "h": (y1 - y0 + 2 * pad) / H,
            })

        # 按句末标点断句（words 顺序即阅读顺序）
        sents, cur = [], []
        for w in words:
            cur.append(w)
            if ends_sentence(w["t"]):
                sents.append(cur)
                cur = []
        if cur:
            sents.append(cur)

        sent_list, sent_starts = [], set()
        for si, ws in enumerate(sents):
            for w in ws:
                w["s"] = si
            sent_starts.add(ws[0]["i"])
            text = join_sentence([w["t"] for w in ws])
            sent_list.append({
                "id": si, "text": text,
                "hard": difficulty.sentence_hard(
                    text, settings["hard_len"], settings["rare_zipf"]),
            })
        difficulty.mark_words(words, sent_starts, settings["rare_zipf"])

        return {"page": n + 1, "total": doc.page_count, "img": img,
                "words": words, "sents": sent_list}
    finally:
        doc.close()


# ---------------- TXT ----------------

ENCODINGS = ("utf-8-sig", "utf-8", "gb18030", "big5", "latin-1")


def read_txt(path):
    with open(path, "rb") as f:
        data = f.read()
    for enc in ENCODINGS:
        try:
            return data.decode(enc), enc
        except (UnicodeDecodeError, LookupError):
            continue
    return data.decode("utf-8", errors="replace"), "utf-8"


def txt_paragraphs(path):
    text, _ = read_txt(path)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    paras = []
    for p in re.split(r"\n[ \t]*\n+", text):
        lines = [ln.strip() for ln in p.split("\n") if ln.strip()]
        if not lines:
            continue
        para = re.sub(r"\s+", " ", " ".join(lines)).strip()
        if para:
            paras.append(para)
    if not paras:
        paras = [ln.strip() for ln in text.split("\n") if ln.strip()]
    return paras


CHUNK_SIZE = 40


def txt_chunk_count(paras):
    return max(1, math.ceil(len(paras) / CHUNK_SIZE))


def txt_chunk_payload(paras, chunk, settings):
    total = txt_chunk_count(paras)
    idx = min(max(chunk, 0), total - 1)
    start = idx * CHUNK_SIZE
    end = min(start + CHUNK_SIZE, len(paras))
    out_paras, tokens_all = [], []
    for gi in range(start, end):
        para = paras[gi]
        toks = tokenize(para)
        tokens_all.extend(toks)
        sents = []
        for si, g in enumerate(build_sentences(toks)):
            text = join_sentence(g)
            sents.append({"i": si, "text": text, "hard": difficulty.sentence_hard(
                text, settings["hard_len"], settings["rare_zipf"])})
        out_paras.append({"idx": gi, "text": para, "sents": sents})
    rare = difficulty.rare_words_of_tokens(tokens_all, settings["rare_zipf"])
    return {"chunk": idx, "total_chunks": total,
            "paragraphs": out_paras, "rare": sorted(rare)}
