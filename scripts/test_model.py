"""翻译模型直接测试：离线加载 + GPU bf16 + 生成质量。"""
import os
import sys
import time

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("HF_HOME", os.path.join(
    os.path.expanduser("~"), ".cache", "huggingface"))
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")

MID = "Helsinki-NLP/opus-mt-en-zh"

import torch  # noqa: E402
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer  # noqa: E402

t0 = time.time()
tok = AutoTokenizer.from_pretrained(MID, local_files_only=True)
device = "cuda" if torch.cuda.is_available() else "cpu"
dtype = torch.bfloat16 if (device == "cuda" and torch.cuda.is_bf16_supported()) else torch.float32
model = AutoModelForSeq2SeqLM.from_pretrained(MID, local_files_only=True, dtype=dtype)
model.to(device).eval()
print(f"[加载] {time.time()-t0:.1f}s -> {device} / {dtype}")

SENTS = [
    "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.",
    "However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.",
    "One dollar and eighty-seven cents.",
    "The ubiquitous glass-and-steel towers obfuscate a meticulous narrative about the city's working classes.",
]

for s in SENTS:
    t1 = time.time()
    inputs = tok([s], return_tensors="pt", truncation=True, max_length=380)
    in_len = inputs["input_ids"].shape[1]
    inputs = {k: v.to(device) for k, v in inputs.items()}
    with torch.no_grad():
        out = model.generate(**inputs, num_beams=4,
                             max_new_tokens=min(420, int(in_len * 1.6) + 40))
    zh = tok.decode(out[0], skip_special_tokens=True).strip()
    dt = time.time() - t1
    print(f"\n[{dt:.2f}s] {s[:60]}{'…' if len(s) > 60 else ''}")
    print(f"    译文: {zh}")
    assert zh and len(zh) > 4, "空译文，bf16 可能有问题"

print("\nMODEL_OK")
