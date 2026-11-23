"""下载并安装 ECDICT 离线词典（SQLite 版，多镜像回退）。"""
import os
import shutil
import sqlite3
import sys
import urllib.request
import zipfile

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DICT_DIR = os.path.join(BASE, "data", "dict")
TMP_DIR = os.path.join(BASE, "data", "tmp")
DB_PATH = os.path.join(DICT_DIR, "ecdict.db")

ASSET_NAME = "ecdict-sqlite-28.zip"
DIRECT = "https://github.com/skywind3000/ECDICT/releases/download/1.0.28/" + ASSET_NAME
MIRRORS = [
    DIRECT,
    "https://ghproxy.net/" + DIRECT,
    "https://ghfast.top/" + DIRECT,
    "https://gh-proxy.com/" + DIRECT,
]


def download(zip_path):
    for url in MIRRORS:
        print(f"尝试：{url}")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=60) as r, open(zip_path, "wb") as f:
                shutil.copyfileobj(r, f, 1024 * 1024)
            if zipfile.is_zipfile(zip_path):
                return True
            print("下载不完整，换下一个源重试…")
        except Exception as e:  # noqa: BLE001
            print(f"失败：{e}")
    return False


def main():
    if os.path.exists(DB_PATH):
        print(f"[OK] 词典已存在：{DB_PATH}")
        return
    os.makedirs(TMP_DIR, exist_ok=True)
    os.makedirs(DICT_DIR, exist_ok=True)
    zip_path = os.path.join(TMP_DIR, ASSET_NAME)
    if not (os.path.exists(zip_path) and zipfile.is_zipfile(zip_path)):
        if not download(zip_path):
            print("[失败] 多个下载源均不可用，请手动下载：")
            print(f"  {DIRECT}")
            print(f"  解压出的 .db 改名为 {DB_PATH}")
            sys.exit(1)
    with zipfile.ZipFile(zip_path) as z:
        db_files = [n for n in z.namelist() if n.lower().endswith(".db")]
        z.extractall(TMP_DIR)
    if not db_files:
        print("[失败] 压缩包内没有 .db 文件")
        sys.exit(1)
    src = os.path.join(TMP_DIR, db_files[0])
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    shutil.move(src, DB_PATH)
    # 验证
    c = sqlite3.connect(DB_PATH)
    names = [r[0] for r in c.execute(
        "SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
    table = "stardict" if "stardict" in names else names[0]
    n = c.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    c.close()
    print(f"[OK] 词典安装完成：{DB_PATH}（{n:,} 词条）")


if __name__ == "__main__":
    main()
