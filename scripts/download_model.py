"""下载翻译模型到本地 models/hf。

注意：HF_ENDPOINT 必须在 import huggingface_hub 之前设置才生效
（huggingface_hub 在 import 时就把常量固化了）。用法：
   python scripts/download_model.py [模型名]
"""
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# sentencepiece 在 Windows 上打不开含中文的路径，模型缓存必须用 ASCII 路径
os.environ.setdefault("HF_HOME", os.path.join(
    os.path.expanduser("~"), ".cache", "huggingface"))
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
os.environ.setdefault("HF_HUB_DOWNLOAD_TIMEOUT", "60")
# huggingface_hub 2.x 默认走 Xet 协议，镜像站不支持，必须关掉
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
# 国内网络直连 huggingface.co 基本不通，默认走镜像
os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")

DEFAULT_MODEL = "Helsinki-NLP/opus-mt-en-zh"


def main():
    repo = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_MODEL
    from huggingface_hub import snapshot_download
    try:
        path = snapshot_download(repo_id=repo)
        print(f"[OK] 模型已保存到：{path}")
        return path
    except Exception as e:  # noqa: BLE001
        print(f"镜像下载失败：{e}")
    # 兜底：尝试直连官方源
    os.environ["HF_ENDPOINT"] = "https://huggingface.co"
    try:
        import importlib
        import huggingface_hub.constants as hc
        importlib.reload(hc)
        from huggingface_hub import snapshot_download as sd2
        path = sd2(repo_id=repo)
        print(f"[OK] 模型已保存到：{path}")
        return path
    except Exception as e:  # noqa: BLE001
        print(f"直连也失败：{e}")
    print(f"[失败] 请手动下载 {repo}（浏览器打开 https://hf-mirror.com/{repo}），"
          f"或把模型文件夹放到 {os.environ.get('HF_HOME')}")
    sys.exit(1)


if __name__ == "__main__":
    main()
