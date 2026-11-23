"""opus-mt 中英翻译模型封装（transformers，GPU 优先，带译文缓存）。"""
import os
import threading
import time

from .store import BASE_DIR, cache_get, cache_put, get_settings

# 模型缓存放用户主目录的 ASCII 路径（sentencepiece 的 C++ 窄字符 API
# 打不开含中文的项目路径，模型必须放在纯 ASCII 路径下）
os.environ.setdefault("HF_HOME", os.path.join(
    os.path.expanduser("~"), ".cache", "huggingface"))
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")

DEFAULT_MODEL = "Helsinki-NLP/opus-mt-en-zh"


class ModelNotReady(Exception):
    pass


class Translator:
    def __init__(self):
        self.ready = False
        self.loading = False
        self.error = None
        self.model_id = None
        self.device = "cpu"
        self._torch = None
        self._tok = None
        self._model = None
        self._lock = threading.Lock()
        self._gen = threading.Lock()

    def status(self):
        return {"ready": self.ready, "loading": self.loading, "error": self.error,
                "model": self.model_id or get_settings().get("model_id", ""),
                "device": self.device}

    def ensure_loading(self):
        with self._lock:
            if self.ready or self.loading:
                return
            self.loading = True
        threading.Thread(target=self._load, daemon=True,
                         name="model-loader").start()

    @staticmethod
    def _from_pretrained(cls, mid, **kw):
        """离线优先：已下载就直接读本地，失败再联网。"""
        try:
            return cls.from_pretrained(mid, local_files_only=True, **kw)
        except Exception:
            return cls.from_pretrained(mid, **kw)

    def _load(self):
        mid = get_settings().get("model_id") or DEFAULT_MODEL
        try:
            import torch
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
            tok = self._from_pretrained(AutoTokenizer, mid)
            device = "cuda" if torch.cuda.is_available() else "cpu"
            dtype = (torch.bfloat16
                     if device == "cuda" and torch.cuda.is_bf16_supported()
                     else torch.float32)
            model = self._from_pretrained(
                AutoModelForSeq2SeqLM, mid, dtype=dtype)
            model.to(device).eval()
            with self._lock:
                self._torch, self._tok, self._model = torch, tok, model
                self.model_id, self.device = mid, device
                self.ready, self.loading = True, False
            print(f"[翻译模型] {mid} 已加载 -> {device}", flush=True)
        except Exception as e:  # noqa: BLE001
            with self._lock:
                self.error = str(e)
                self.loading = False
            print(f"[翻译模型] 加载失败: {e}", flush=True)

    def translate(self, text: str) -> dict:
        src = " ".join((text or "").split())
        if not src:
            return {"translation": "", "cached": True, "seconds": 0.0}
        hit = cache_get(src)
        if hit is not None:
            return {"translation": hit, "cached": True, "seconds": 0.0}
        with self._lock:
            ready = self.ready
        if not ready:
            self.ensure_loading()
            raise ModelNotReady()
        torch, tok, model = self._torch, self._tok, self._model
        device = self.device
        t0 = time.time()
        with self._gen:
            inputs = tok([src], return_tensors="pt", truncation=True,
                          max_length=380)
            in_len = inputs["input_ids"].shape[1]
            inputs = {k: v.to(device) for k, v in inputs.items()}
            with torch.no_grad():
                out = model.generate(
                    **inputs, num_beams=4,
                    max_new_tokens=min(420, int(in_len * 1.6) + 40))
            dst = tok.decode(out[0], skip_special_tokens=True).strip()
        cache_put(src, dst, self.model_id)
        return {"translation": dst, "cached": False,
                "seconds": round(time.time() - t0, 2)}


translator = Translator()
