"""生词与长难句判定（基于 wordfreq 词频）。"""
import re
from .nlp import WORD_RE

_zipf_cache = {}
_loaded = False


def _zipf_frequency(word: str) -> float:
    global _loaded
    key = word.lower()
    if key in _zipf_cache:
        return _zipf_cache[key]
    from wordfreq import zipf_frequency
    v = float(zipf_frequency(key, "en", wordlist="best"))
    _zipf_cache[key] = v
    if len(_zipf_cache) > 20000:
        _zipf_cache.clear()
    return v


def zipf(word: str) -> float:
    """词频 zipf 值：约 7=最常见，3≈前2万开外，0=语料库未收录。带异常保护。"""
    try:
        return _zipf_frequency(word)
    except Exception:
        return 0.0


WORD_OK = re.compile(r"^[A-Za-z][A-Za-z'’\-]*$")


def word_core(t: str) -> str:
    """剥掉词周围粘连的标点与数字，保留纯词干。"""
    return t.strip("“”‘’\"'()[]<>.,;:!?…—-·*#0123456789").strip("“”‘’\"'()[]<>.,;:!?…—-·*#").strip()


def is_rare(core: str, sentence_start: bool, thresh: float) -> bool:
    if not core or not WORD_OK.match(core):
        return False
    z = zipf(core)
    if z == 0.0:
        # 语料库不认识：生僻词；但句中大写形式大概率是专有名词
        return not (core[0].isupper() and not sentence_start)
    if z >= thresh:
        return False
    if core[0].isupper() and not sentence_start and z < 3.8:
        return False  # 人名地名
    return True


def mark_words(words, sent_starts, thresh):
    """words: [{i,t,s,...}]，原地设置 rare 布尔字段。"""
    for w in words:
        core = word_core(w["t"])
        w["rare"] = bool(core) and is_rare(core, w["i"] in sent_starts, thresh)


def rare_words_of_tokens(tokens, thresh):
    """文本模式：返回一个 chunk 内的生词小写集合（含专有名词剔除启发）。"""
    seen_lower = set()
    all_forms = set()
    for t in tokens:
        all_forms.add(t)
        seen_lower.add(t.lower())
    # 只以大写形式出现过、且语料库不认识 -> 疑似专名
    probable_names = {
        t for t in all_forms
        if t[:1].isupper() and t.lower() not in seen_lower and zipf(t) == 0.0
    }
    name_lows = {t.lower() for t in probable_names}
    rare = set()
    for low in seen_lower:
        if low in name_lows:
            continue
        core = word_core(low)
        if not core or not WORD_OK.match(core):
            continue
        z = zipf(core)
        if z == 0.0 or z < thresh:
            rare.add(low)
    return rare


def sentence_hard(text: str, hard_len: int = 28, rare_thresh: float = 3.55) -> bool:
    """长难句判定：长度、生词密度、从句标点信号。"""
    toks = [t for t in WORD_RE.findall(text) if any(c.isalpha() for c in t)]
    n = len(toks)
    if n == 0:
        return False
    rare = sum(1 for t in toks if 0.0 < zipf(t) < rare_thresh)
    punct = sum(text.count(c) for c in ",;:—-")
    if n >= hard_len:
        return True
    if n >= 18 and rare >= 2:
        return True
    if rare >= 4:
        return True
    if n >= 22 and punct >= 4:
        return True
    return False
