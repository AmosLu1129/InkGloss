"""轻量文本处理：分词、断句、句子拼接。无外部依赖。"""
import re

# 完整单词（允许内部连字符 / 撇号），用于词频与生词统计
WORD_RE = re.compile(r"[A-Za-z0-9]+(?:[’'\u2019-][A-Za-z0-9]+)*")
# 分词：单词或单个标点
TOKEN_RE = re.compile(r"[A-Za-z0-9]+(?:[’'\u2019-][A-Za-z0-9]+)*|[^\sA-Za-z0-9]")

END_PUNCT = ".!?…"
CLOSE_QUOTES = "”’\"')]}»』」"

# 句末缩写保护表（后接句点不视为句子结束）
ABBREV = {
    "mr", "mrs", "ms", "dr", "st", "jr", "sr", "prof", "hon", "gen", "capt",
    "lt", "col", "rev", "etc", "eg", "ie", "al", "ed", "eds", "pp", "vol",
    "ch", "fig", "figs", "no", "nos", "cf", "ca", "vs", "inc", "ltd", "co",
    "corp", "dept", "est", "approx", "ave", "blvd", "rd", "mt", "ft",
    "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept", "oct",
    "nov", "dec", "mon", "tue", "wed", "thu", "fri", "sat", "sun",
    "a.m", "p.m", "u.s", "u.k", "u.n", "e.g", "i.e", "ph.d", "m.d", "b.a",
    "m.a", "d.c",
}


def tokenize(text: str):
    return TOKEN_RE.findall(text)


def ends_sentence(token: str) -> bool:
    """词尾直接带句末标点的情况（PDF 词形，如 wife. / last?"）。"""
    core = token.rstrip(CLOSE_QUOTES)
    if len(core) < 2 or core[-1] not in END_PUNCT:
        return False
    head = core[:-1].rstrip(END_PUNCT)
    if not head or head.lower() in ABBREV:
        return False
    if len(head) == 1 and head.isalpha():
        return False
    return True


def _is_bare_end(token: str) -> bool:
    """独立的句末标点 token（TXT 分词产物）：. ! ? …"""
    core = token.rstrip(CLOSE_QUOTES)
    return bool(core) and all(c in END_PUNCT for c in core) and len(core) <= 3


def _bare_ends(tokens, i: int) -> bool:
    """判断裸标点是否真的结束句子（排除缩写、人名首字母、小数点、省略号）。"""
    prev = tokens[i - 1] if i > 0 else ""
    nxt = tokens[i + 1] if i + 1 < len(tokens) else None
    if not re.match(r"[A-Za-z0-9]", prev):
        return False                       # 前面不是词（如省略号的连点）
    pc = prev.rstrip(CLOSE_QUOTES)
    if pc.lower() in ABBREV:
        return False                       # Mr . / etc .
    if len(pc) == 1 and pc.isalpha():
        return False                       # p.m / e.g / U.S / 人名首字母
    if pc[-1].isdigit() and nxt is not None and re.match(r"[0-9]", nxt):
        return False                       # 3.14
    return True


def build_sentences(tokens):
    """tokens -> [[token, ...], ...]

    兼容两种分词形态：
    - PDF 词（标点粘连在词尾）：wife. said?" -> ends_sentence
    - TXT 分词（标点是独立 token）：wife . -> _is_bare_end + _bare_ends
    句末后的收尾引号按“引语深度配平”归入上一句。
    """
    sents, cur, depth = [], [], 0

    def flush():
        if any(ch.isalnum() for tok in cur for ch in tok):
            sents.append(list(cur))
        cur.clear()

    for i, t in enumerate(tokens):
        if t == "“" or t == "‘":
            depth += 1
            cur.append(t)
        elif t == "”" or t == "’":
            depth = max(0, depth - 1)
            if sents and not cur:
                sents[-1].append(t)      # 收尾引号归上一句
            else:
                cur.append(t)
        elif t == '"':
            if depth > 0:
                depth -= 1
                if sents and not cur:
                    sents[-1].append(t)  # 在引语内 -> 收尾引号归上一句
                else:
                    cur.append(t)
            else:
                depth += 1
                cur.append(t)
        elif sents and not cur and t and all(c in ".…" for c in t) and len(t) <= 3:
            sents[-1].append(t)          # 句末省略号归上一句
        else:
            cur.append(t)
            if ends_sentence(t):
                flush()
            elif _is_bare_end(t) and _bare_ends(tokens, i):
                flush()
    if cur:
        flush()
    return sents


_NO_SPACE_BEFORE = set(",.!?;:%)]}»…")
_GLUE_AFTER = set("([{“‘")


def join_sentence(tokens):
    """tokens -> 干净的句子文本。

    - 跨行断词：compre- + hensive -> comprehensive
    - 标点前不留空格；收尾引号前不留空格；开引号后不留空格
      （ASCII " 的开合方向由引语深度配平决定）
    """
    out, marks, depth = [], [], 0
    for t in tokens:
        if t in ("“", "‘"):
            d = 1
        elif t in ("”", "’"):
            d = -1
        elif t == '"':
            d = -1 if depth > 0 else 1
        else:
            d = 0
        if d == 1:
            depth += 1
        elif d == -1:
            depth = max(0, depth - 1)
        out.append(t)
        marks.append(d)

    s_parts = []
    for i, t in enumerate(out):
        if not s_parts:
            s_parts.append(t)
            continue
        ptxt = s_parts[-1]
        if ptxt.endswith("-") and (t[:1].islower() or t[:1].isdigit()):
            s_parts[-1] = ptxt[:-1] + t      # 跨行断词
            continue
        glue = False
        if t and (t[0] in _NO_SPACE_BEFORE or marks[i] == -1):
            glue = True                       # 标点 / 收尾引号
        elif marks[i - 1] == 1 or out[i - 1] in _GLUE_AFTER:
            glue = True                       # 紧跟开引号 / 开括号
        s_parts.append(("" if glue else " ") + t)
    return "".join(s_parts).strip()


def split_text_sentences(text: str):
    return [join_sentence(g) for g in build_sentences(tokenize(text))]
