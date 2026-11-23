"""断句 / 拼接逻辑自测。"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.nlp import join_sentence, split_text_sentences  # noqa: E402

T1 = ('It is a truth universally acknowledged, that a single man in '
      'possession of a good fortune, must be in want of a wife. '
      '"My dear Mr. Bennet," said his lady, "have you heard that '
      'Netherfield Park is let at last?" Mr. Bennet replied that he '
      'had not. Was it courage or sheer obstinacy? Perhaps not.')

T2 = ("The patient met Dr. Grant at 3 p.m. and asked about the "
      "medication... he was worried, of course.")

s1 = split_text_sentences(T1)
print("T1 句数 =", len(s1))
for s in s1:
    print("  -", s)

s2 = split_text_sentences(T2)
print("T2 句数 =", len(s2))
for s in s2:
    print("  -", s)

j = join_sentence(["The", "compre-", "hensive", "answer", "(", "see",
                   "page", "12", ")", "."])
print("JOIN =", j)
assert j == "The comprehensive answer (see page 12).", j

assert len(s1) == 5, f"预期 5 句，得到 {len(s1)}"
assert s1[1].endswith('at last?"'), s1[1]
assert s1[2].startswith("Mr. Bennet replied"), s1[2]
assert len(s2) == 2, f"预期 2 句，得到 {len(s2)}"
assert s2[0].endswith("medication..."), s2[0]
assert s2[1].startswith("he was worried"), s2[1]
print("TEST_OK")
