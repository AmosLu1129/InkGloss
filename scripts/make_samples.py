"""生成两本示例书（带文字层的 PDF + TXT）并注册到书库。
   内容为公版文学选段 + 专门包含长难句和生词的自写段落。"""
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE)

import pymupdf  # noqa: E402

from app import extract, store  # noqa: E402

TITLE_PDF = "English Reading Sampler.pdf"
TITLE_TXT = "The Gift of the Magi.txt"

INTRO = ("Click any word to see its dictionary entry; double-click a word to "
         "translate the whole sentence; or drag across several words to "
         "translate a phrase. Turn on smart mode to underline rare words and "
         "to detect long, difficult sentences automatically.")

DICKENS_1 = ("It was the best of times, it was the worst of times, it was the "
             "age of wisdom, it was the age of foolishness, it was the epoch "
             "of belief, it was the epoch of incredulity, it was the season "
             "of Light, it was the season of Darkness, it was the spring of "
             "hope, it was the winter of despair, we had everything before "
             "us, we had nothing before us, we were all going direct to "
             "Heaven, we were all going direct the other way - in short, the "
             "period was so far like the present period, that some of its "
             "noisiest authorities insisted on its being received, for good "
             "or for evil, in the superlative degree of comparison only.")

DICKENS_2 = ("There were a king with a large jaw and a queen with a plain "
             "face, on the throne of England; there were a king with a large "
             "jaw and a queen with a fair face, on the throne of France. In "
             "both countries it was clearer than crystal to the lords of the "
             "State preserves of loaves and fishes, that things in general "
             "were settled for ever.")

AUSTEN_1 = ("It is a truth universally acknowledged, that a single man in "
            "possession of a good fortune, must be in want of a wife.")

AUSTEN_2 = ("However little known the feelings or views of such a man may be "
            "on his first entering a neighbourhood, this truth is so well "
            "fixed in the minds of the surrounding families, that he is "
            "considered the rightful property of some one or other of their "
            "daughters.")

AUSTEN_3 = ('"My dear Mr. Bennet," said his lady to him one day, "have you '
            'heard that Netherfield Park is let at last?" Mr. Bennet replied '
            'that he had not. "But it is," returned she; "for Mrs. Long has '
            'just been here, and she told me all about it." Mr. Bennet made '
            'no answer. "Do not you want to know who has taken it?" cried his '
            'wife impatiently. "You want to tell me, and I have no objection '
            'to hearing it." This was invitation enough.')

ESSAY_1 = ("Serendipity is an ephemeral guest. It arrives without warning, "
           "lingers for a moment beside the meticulous planner and the "
           "perfunctory idler alike, and then vanishes into the ubiquitous "
           "hum of the everyday, leaving behind only a faint, enigmatic "
           "fragrance of possibility.")

ESSAY_2 = ("The ubiquitous glass-and-steel towers that have proliferated "
           "across the skyline over the past two decades, though frequently "
           "celebrated by developers as quintessential symbols of "
           "metropolitan modernity, obfuscate a far more meticulous and "
           "garrulous narrative about the city's working classes, whose "
           "perfunctory labor, carried out behind immaculate facades, "
           "remains as invisible to the casual passer-by as the enigmatic "
           "machinery humming in the basement.")

ESSAY_3 = ("A garrulous old man once told me that the city keeps its enigma "
           "behind immaculate facades, and that the quintessential art of "
           "living here is to look twice: once at what obfuscates, and once "
           "at what remains.")

DIALOG_1 = ('"I am afraid, Dr. Grant, that the patient\'s condition has '
            'deteriorated overnight," said Mr. Whitfield, adjusting his '
            'spectacles with a perfunctory sigh. "The fever has proved more '
            'obstinate than we anticipated, and the peculiar restlessness '
            'you observed yesterday has not abated."')

DIALOG_2 = ('"Nonsense," replied Dr. Grant. "I have treated a hundred such '
            'cases, and none of them has ever baffled me for more than a '
            'week. Send for the pharmacy at once, and let us see whether a '
            'judicious dose of quinine cannot restore him before Friday."')

DIALOG_3 = ("Was it courage or sheer obstinacy that made him speak so? "
            "Perhaps it was neither; perhaps it was simply the old "
            "physician's incurable faith in his own prescriptions!")

MAGI_1 = ("One dollar and eighty-seven cents. That was all. And sixty cents "
          "of it was in pennies. Pennies saved one and two at a time by "
          "bulldozing the grocer and the vegetable man and the butcher until "
          "one's cheeks burned with the silent imputation of parsimony that "
          "such close dealing implied. Three times Della counted it. One "
          "dollar and eighty-seven cents. And the next day would be "
          "Christmas.")

MAGI_2 = ("There was clearly nothing to do but flop down on the shabby "
          "little couch and howl. So Della did it. Which instigates the "
          "moral reflection that life is made up of sobs, sniffles, and "
          "smiles, with sniffles predominating.")

MAGI_3 = ("While the mistress of the home is gradually subsiding from the "
          "first stage to the second, take a look at the home. A furnished "
          "flat at $8 per week. It did not exactly beggar description, but "
          "it certainly had that word on the lookout for the mendicancy "
          "squad.")

MAGI_4 = ("In the vestibule below was a letter-box into which no letter "
          "would go, and an electric button from which no mortal finger "
          "could coax a ring. Also appertaining thereunto was a card "
          "bearing the name 'Mr. James Dillingham Young.'")

MAGI_5 = ("The 'Dillingham' had been flung to the breeze during a former "
          "period of prosperity when its possessor was being paid $30 per "
          "week. Now, when the income was shrunk to $20, the letters of "
          "'Dillingham' looked blurred, as though they were thinking "
          "seriously of contracting to a modest and unassuming D. But "
          "whenever Mr. James Dillingham Young came home and reached his "
          "flat above he was called 'Jim' and greatly hugged by Mrs. James "
          "Dillingham Young, already introduced to you as Della. Which is "
          "all very good.")

AFTERWORD = ("Reading a novel in a foreign language is a gradual and "
             "sometimes garrulous conversation between your patience and "
             "the author's imagination. Do not be discouraged by the "
             "ubiquitous long sentences of the Victorian era; they are less "
             "enigmatic than they appear. A meticulous reader who dissects "
             "them clause by clause will discover that their architecture, "
             "however ornate, is held together by the most quintessential of "
             "grammatical glues: the humble comma, the semicolon, and the "
             "occasional dash. Nothing here is designed to obfuscate; on the "
             "contrary, the prose intends to be as transparent as the "
             "immaculate windows of a greenhouse, through which even the "
             "most perfunctory glance can perceive the whole garden at once.")


def build_pdf(path):
    doc = pymupdf.open()
    W, H, M = 595, 842, 64
    state = {"page": None, "y": M}

    def new_page():
        state["page"] = doc.new_page(width=W, height=H)
        state["y"] = M

    def put(text, size=11.5, font="tiro", gap=10, align=0):
        if state["page"] is None:
            new_page()
        tries = 0
        while True:
            # 剩余空间不足一行 -> 翻页
            if state["y"] >= H - M - size * 1.3:
                new_page()
                tries += 1
                if tries > 2:
                    raise RuntimeError("样例段落过长，无法放入单页")
                continue
            rect = pymupdf.Rect(M, state["y"], W - M, H - M)
            try:
                rc = state["page"].insert_textbox(
                    rect, text, fontname=font, fontsize=size, align=align)
            except ValueError:
                new_page()
                tries += 1
                if tries > 2:
                    raise
                continue
            if rc < 0:
                new_page()
                tries += 1
                if tries > 2:
                    raise RuntimeError("样例段落过长，无法放入单页")
                continue
            state["y"] = H - M - rc + gap
            return

    put("English Reading Sampler", size=24, font="helv", gap=6, align=1)
    put("A sample book for the auto-translating reader",
        size=11, font="helv", gap=18, align=1)
    put(INTRO, size=10, font="helv", gap=14)
    for para in (DICKENS_1, DICKENS_2, AUSTEN_1, AUSTEN_2, AUSTEN_3,
                 ESSAY_1, ESSAY_2, ESSAY_3, DIALOG_1, DIALOG_2, DIALOG_3):
        put(para)
    doc.save(path, garbage=4, deflate=True)
    doc.close()


def build_txt(path):
    text = "\n\n".join([MAGI_1, MAGI_2, MAGI_3, MAGI_4, MAGI_5, AFTERWORD]) + "\n"
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def register(path, kind):
    for b in store.list_books():
        if os.path.abspath(b["path"]) == os.path.abspath(path):
            return b["id"]
    if kind == "pdf":
        pages = extract.pdf_page_count(path)
    else:
        pages = extract.txt_chunk_count(extract.txt_paragraphs(path))
    return store.add_book(os.path.splitext(os.path.basename(path))[0],
                          path, kind, pages)


def main():
    pdf_path = os.path.join(store.BOOKS_DIR, TITLE_PDF)
    txt_path = os.path.join(store.BOOKS_DIR, TITLE_TXT)
    if not os.path.exists(pdf_path):
        build_pdf(pdf_path)
        print("生成 PDF 样例：", pdf_path)
    if not os.path.exists(txt_path):
        build_txt(txt_path)
        print("生成 TXT 样例：", txt_path)
    b1 = register(pdf_path, "pdf")
    b2 = register(txt_path, "txt")
    print(f"书库注册完成：PDF #{b1}，TXT #{b2}")


if __name__ == "__main__":
    main()
