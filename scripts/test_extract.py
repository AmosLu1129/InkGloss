"""提取层冒烟测试：PDF 页面负载 / TXT 分块 / 难度标注。"""
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE)

from app import store  # noqa: E402
from app.difficulty import zipf  # noqa: E402
from app.extract import (  # noqa: E402
    pdf_page_payload, txt_chunk_payload, txt_paragraphs)

BOOKS = store.list_books()
settings = store.get_settings()
pdf_book = next(b for b in BOOKS if b["kind"] == "pdf")
txt_book = next(b for b in BOOKS if b["kind"] == "txt")

# ---- PDF ----
p1 = pdf_page_payload(pdf_book["path"], 1, settings)
print(f"[PDF] 第1页: {len(p1['words'])} 词, {len(p1['sents'])} 句, "
      f"图片 {len(p1['img']) // 1024} KB")
for s in p1["sents"][:3]:
    print("  句:", s["text"][:80], "| hard =", s["hard"])

rare_words = [w["t"] for w in p1["words"] if w.get("rare")]
print("  第1页生词:", rare_words[:12])

# 找长难句所在页
hard_pages = []
for n in range(1, min(p1["total"], 6) + 1):
    pl = pdf_page_payload(pdf_book["path"], n, settings)
    hs = [s for s in pl["sents"] if s["hard"]]
    if hs:
        hard_pages.append((n, hs))
print(f"[PDF] 检出长难句的页: {[n for n, _ in hard_pages]}")
for n, hs in hard_pages[:1]:
    for s in hs[:2]:
        words = len(s["text"].split())
        print(f"  第{n}页难句({words}词):", s["text"][:100], "…")

# ---- TXT ----
paras = txt_paragraphs(txt_book["path"])
print(f"\n[TXT] 段落数: {len(paras)}")
c0 = txt_chunk_payload(paras, 0, settings)
print(f"[TXT] 第0块: {len(c0['paragraphs'])} 段, 生词 {len(c0['rare'])} 个")
print("  TXT 生词:", c0["rare"][:14])
hard_txt = [s for p in c0["paragraphs"] for s in p["sents"] if s["hard"]]
print(f"  TXT 难句数: {len(hard_txt)}")
for s in hard_txt[:1]:
    print("  难句:", s["text"][:100], "…")

# ---- 词频 sanity ----
for w in ("the", "of", "acknowledged", "serendipity", "quintessential"):
    print(f"zipf({w}) =", round(zipf(w), 2))

assert len(p1["words"]) > 40
assert len(p1["sents"]) >= 2
assert rare_words, "第1页应有生词标注"
assert hard_pages, "应检出长难句"
assert "garrulous" in {w.lower() for w in c0["rare"]}
assert "enigmatic" in {w.lower() for w in c0["rare"]}
print("\nSMOKE_OK")
