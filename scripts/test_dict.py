"""词典查询测试：原型 / 变形还原 / 大小写 / 生僻词。"""
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE)

from app.dictionary import lookup  # noqa: E402

cases = [
    ("acknowledge", True),
    ("mice", True),          # exchange 0:mouse
    ("running", True),       # ing 变形
    "England",
    "serendipity",
    "ephemeral",
    ("quintessential", True),
    "grocer",
    ("xyzzyqq", False),      # 杜撰词，应未收录
]

for c in cases:
    word, *expect = c if isinstance(c, tuple) else (c,)
    d = lookup(word)
    found = bool(d and d.get("found"))
    trans = (d.get("translation") or "").split("\n")[0] if d else ""
    ph = d.get("phonetic", "")
    print(f"{word:<18} found={found}  {('/' + ph + '/') if ph else '':<14} {trans[:46]}")
    if expect:
        assert found == expect[0], (word, found)

d = lookup("mice")
assert d["found"] and ("老鼠" in d.get("translation", "")), d
d2 = lookup("running")
assert d2["found"], d2
d3 = lookup("The")
assert d3["found"], d3
print("\nDICT_OK")
