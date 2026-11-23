# 📚 InkGloss · 自动翻译阅读器

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10%E2%80%933.14-3776AB.svg)](#环境要求)
[![Offline First](https://img.shields.io/badge/Mode-100%25%20Offline-2E7D5B.svg)](#功能一览)

读英文原版书时的**全离线伴读工具**：**单击查词义、双击译整句、拖选译短语**。
专为「遇上生词与长难句不想停下翻手机」的沉浸阅读场景打造——词典、神经翻译模型、书库、生词本与前端界面全部本地运行，断网可用。

---

## 功能一览

| 模块 | 核心特性 |
|---|---|
| 📖 **现代书房书库** | 支持带文字层 PDF 与 TXT，支持拖拽多文件导入或本机路径直连；「继续阅读」精选卡、PDF 首页缩略封面、TXT 程序化布面精装封面、`全部 / PDF / TXT` 筛选与书名实时搜索，自动记忆每本书阅读进度 |
| 🔍 **离线查词（ECDICT）** | 单击任意单词弹出精致词卡：音标、Windows 本地发音、按词性排版释义、英英释义、柯林斯星级、四六级/考研/雅思/托福/GRE 标签、词频条；自动还原词形（`mice → mouse`、`running → run`）；未收录词支持回退模型直译 |
| 🈶 **本地神经整句/短语翻译** | 双击句中任意词翻译整句，拖选多个词点击「译短语」悬浮胶囊；基于 `opus-mt-en-zh` 本地推理，译文存入 SQLite 缓存，复读零延迟，支持一键复制译文 |
| 📄 **PDF 原版精准模式** | 页面渲染为高清图像并叠加精确百分比透明词框层，保留原书学术论文/排版格式；支持 `75%–145%` 缩放、页码直跳、桌面端左右悬浮翻页与 `←`/`→`/`PgUp`/`PgDn` 键盘翻页 |
| 📃 **TXT 纸页排版模式** | 独立纸页卡片流式排版，支持 `15–26px` 实时字号调节与滚动自动续载分节 |
| 🧠 **智能伴读模式（默认关）** | 顶栏一键开启：按 `wordfreq` 词频阈值自动标出生词虚点下划线；按词数、生词密度与从句结构检测长难句，支持页面行间/边栏标注与后台预译，点击难句侧栏卡片可直接定位原文 |
| 🎨 **四套护眼纸色主题** | 内置 **典雅米纸**、**霜白极简**、**护眼松绿**、**夜灯暗纸**；暗色模式下 PDF 页面自动启用反色护眼滤镜 |
| ✏️ **生词本与 Anki 导出** | 词卡一键收藏（附带原句语境与来源书名），侧栏支持检索、直接朗读、删除与导出 UTF-8 CSV（可直接导入 Anki） |

---

## 环境要求

- **操作系统**：Windows 10 / 11（支持开箱即用批处理脚本与本地 TTS 发音）
- **Python**：建议 Python 3.10 – 3.14（`py` 启动器或 `python` 命令可用）
- **硬件**：有 NVIDIA 显卡（CUDA）时自动使用 GPU（`bfloat16`）加速推理；无独立显卡自动回退至 CPU
- **网络**：仅**首次安装**需要联网下载依赖、翻译模型（约 300 MB）与 ECDICT 离线词典（压缩包约 207 MB，解压后约 810 MB）；安装完成后**完全断网可用**

---

## 快速开始

### 1. 一键安装（Windows）

克隆或下载仓库到本地（建议放在不含过多特殊字符的路径下），双击运行 **`install.bat`**。脚本将自动完成 5 个步骤：

1. 创建项目虚拟环境 `.venv`
2. 安装 PyTorch（优先 CUDA 12.6 版本，失败时自动回退 CPU 版）
3. 安装 `requirements.txt` 其余依赖（默认 PyPI 较慢时自动切换清华镜像）
4. 下载本地英译中模型 `Helsinki-NLP/opus-mt-en-zh`
5. 下载并解压 ECDICT SQLite 离线词典至 `data/dict/ecdict.db`

> 如希望开箱体验两本内置英文示例书（包含丰富生词与长难句的 PDF 与 TXT），可在安装完成后运行一次：
> ```bat
> .venv\Scripts\python.exe scripts\make_samples.py
> ```

### 2. 日常启动

双击 **`启动阅读器.bat`**（或在终端执行 `.venv\Scripts\python.exe run.py`），程序会自动寻找空闲端口并打开浏览器（地址形如 `http://127.0.0.1:8973`）。关闭命令行窗口即退出服务。

### 3. 手动安装与自测（可选）

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install torch
pip install -r requirements.txt
python scripts/download_model.py
python scripts/download_dict.py
python scripts/make_samples.py   # 可选：生成两本示例书
python run.py
```

校验核心模块是否工作正常（需已安装词典/模型/示例书）：

```powershell
.\.venv\Scripts\python.exe scripts\test_nlp.py
.\.venv\Scripts\python.exe scripts\test_dict.py
.\.venv\Scripts\python.exe scripts\test_extract.py
.\.venv\Scripts\python.exe scripts\test_model.py
```

---

## 目录结构

```text
.
├─ 启动阅读器.bat             # 日常启动脚本（Windows）
├─ install.bat                # 一键安装环境、模型与词典（Windows）
├─ run.py                     # 服务启动器（自动分配空闲端口并打开浏览器）
├─ requirements.txt           # Python 核心依赖清单
├─ LICENSE                    # MIT 开源许可证
├─ .gitignore
├─ docs/
│  └─ DESIGN.md               # 架构与交互设计文档
├─ app/                       # FastAPI 后端与零依赖原生前端
│  ├─ main.py                 #   HTTP API 路由与内存页缓存
│  ├─ extract.py              #   PDF 渲染与词框坐标提取 / TXT 分段分块（PyMuPDF）
│  ├─ dictionary.py           #   ECDICT 离线查询与词形还原
│  ├─ translator.py           #   opus-mt 本地翻译封装与译文缓存
│  ├─ difficulty.py           #   wordfreq 词频生词判定与长难句评分
│  ├─ nlp.py                  #   英文断句、引号配平与跨行连字符拼接
│  ├─ store.py                #   SQLite 持久化（书库 / 生词本 / 译文缓存 / 设置）
│  └─ static/                 #   离线原生前端（HTML / CSS / JS，无外网 CDN）
│     ├─ index.html
│     ├─ style.css
│     └─ app.js
├─ scripts/                   # 安装与自测工具脚本
│  ├─ download_model.py       #   从 HF-Mirror / Hugging Face 下载翻译模型
│  ├─ download_dict.py        #   下载并验证 ECDICT SQLite 词典
│  ├─ make_samples.py         #   生成示例 PDF / TXT 书籍
│  └─ test_*.py               #   断句 / 词典 / 提取 / 模型自测脚本
└─ data/                      # 运行时数据目录（不纳入 Git 版本控制）
   └─ .gitkeep
```

> **提示**：翻译模型默认缓存在 `C:\Users\<用户名>\.cache\huggingface\`（而非项目目录内），因为 `sentencepiece` 的底层 C++ 接口在 Windows 上无法直接打开包含非 ASCII 字符（如中文）的路径。

---

## 常见问题

**Q：双击翻译提示「翻译模型正在加载」？**
首次启动服务后需要在后台加载约 300 MB 的模型到内存/显存（通常需 5–30 秒），加载期间页面顶部会显示加载状态胶囊，消失后即可零等待翻译。

**Q：导入 PDF 时提示「没有文字层」？**
说明该 PDF 是纯图片扫描版，不含可提取文本层。请先使用 OCR 工具（如 Adobe Acrobat、ABBYY、PaddleOCR 等）识别并嵌入文字层后再导入。

**Q：少数 PDF 双栏排版断句从中间断开？**
极少数复杂分栏或含页内脚注的 PDF 文本块顺序可能交错，可使用鼠标直接**拖选整句文字**并点击「译短语」悬浮胶囊完成翻译。

**Q：想微调生词标注数量或更换翻译模型？**
- 点击顶栏「设置」即可调整 `rare_zipf` 生词词频阈值（数值越大标出越多生词）、长难句词数阈值与正文字号。
- 如需换用更高精度多语种模型（如 `facebook/nllb-200-distilled-600M`，约 2.4 GB），可先运行 `python scripts/download_model.py facebook/nllb-200-distilled-600M` 下载，再调整设置中的 `model_id` 并重启服务。

**Q：如何局域网手机/平板协同阅读？**
将 `run.py` 中的 `host="127.0.0.1"` 改为 `"0.0.0.0"`，确保设备处于同一可信局域网，手机浏览器访问 `http://<电脑局域网IP>:8973` 即可阅读。

---

## 致谢（Acknowledgments）

本项目的离线查词、本地机器翻译与排版能力离不开以下优秀开源项目与研究成果的贡献，在此致以诚挚感谢：

- **本地神经机器翻译模型 — [Helsinki-NLP/opus-mt-en-zh](https://huggingface.co/Helsinki-NLP/opus-mt-en-zh)**
  感谢赫尔辛基大学自然语言技术研究组（Language Technology Research Group at the University of Helsinki）开源的 **OPUS-MT** 英中翻译模型（基于 [MarianNMT](https://marian-nmt.github.io/) 与 [OPUS](https://opus.nlpl.eu/) 语料训练，模型权重遵循 [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/) 协议），让普通个人电脑也能流畅运行高质量离线英译中。
- **离线英汉词典 — [ECDICT](https://github.com/skywind3000/ECDICT)**
  感谢 [@skywind3000](https://github.com/skywind3000) 长期维护并开源的 **ECDICT**（340 万+ 词条 SQLite 离线词库，遵循 **MIT License**），为本项目提供音标、词性、柯林斯星级、考试标签与词形变化还原支持。
- **核心技术栈与数据依赖**
  - [wordfreq](https://github.com/rspeer/wordfreq)（Apache-2.0 / CC-BY-SA-4.0）— 英文词频统计与生词阈值判定
  - [PyMuPDF (fitz)](https://github.com/pymupdf/PyMuPDF)（GNU AGPL-3.0）— 高性能 PDF 页面渲染与精确词框提取
  - [Transformers](https://github.com/huggingface/transformers)（Apache-2.0）与 [PyTorch](https://pytorch.org/)（BSD-3-Clause）— 模型加载与本地推理引擎
  - [FastAPI](https://github.com/fastapi/fastapi)（MIT）与 [Uvicorn](https://github.com/encode/uvicorn)（BSD-3-Clause）— 轻量级本地 Web 服务框架
  - [HF-Mirror](https://hf-mirror.com/) — 加速国内环境下 Hugging Face 模型权重拉取

---

## 开源协议（License）

本项目源代码基于 **[MIT License](LICENSE)** 开源。
第三方模型权重、词典数据与依赖库（包括但不限于 `Helsinki-NLP/opus-mt-en-zh`、`ECDICT`、`PyMuPDF`、`wordfreq`）分别受其各自原始开源协议约束，分发或用于商业用途时请一并遵守对应协议条款。
