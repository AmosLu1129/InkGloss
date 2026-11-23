# 自动翻译阅读器 — 设计文档

日期：2026-11-20
状态：已确认（用户逐项确认了以下关键决策）

## 目标

阅读英文书（带文字层的 PDF / TXT）时：
- **单词释义**：单击单词 → 弹出音标、词性、中文释义
- **整句翻译**：双击句中任意词 → 弹出该句的中文翻译（本地离线模型）
- 遇到长难句、生词，不需要离开阅读界面

## 用户已确认的决策

| 决策点 | 选择 |
|---|---|
| 界面形态 | 本地网页版（FastAPI 后端 + 浏览器前端，`127.0.0.1`） |
| 翻译模型 | Helsinki-NLP/opus-mt-en-zh（约 300MB 小模型），有 GPU 则 fp16 加速 |
| 词典 | ECDICT 离线词典（SQLite，约 70MB） |
| 默认触发方式 | 全手动（单击=释义，双击=整句翻译，拖选=短语翻译） |
| 智能模式 | 做成可开关选项：生词自动下划线 + 长难句自动检测预译（默认关闭） |

## 架构

```
浏览器 (app/static: 原生 HTML/CSS/JS)
   │  HTTP JSON
FastAPI (app/main.py, 127.0.0.1:8973)
   ├─ extract.py    PyMuPDF：PDF 页渲染成图 + 单词坐标叠加层；TXT 按段落排版
   ├─ dictionary.py ECDICT SQLite：查词（含变形还原 mice→mouse）+ wordfreq 词频
   ├─ translator.py transformers + opus-mt-en-zh（GPU fp16 / CPU 自适应）+ 译文 SQLite 缓存
   ├─ difficulty.py 长难句评分（长度/从句/生词密度）、生词判定（wordfreq zipf 阈值）
   └─ store.py     SQLite：书库、生词本、译文缓存、设置
```

## 关键交互规范

- **PDF 原版模式**：页面渲染为图片，按单词 bbox 叠加透明点击层，保留原书排版
- **TXT / 文本模式**：流式排版，词包在 `<span>` 中可点击，可调字号
- 单击词 → 词卡（音标/释义/词频/例句上下文/加入生词本）
- 双击词 → 所在整句翻译卡片
- 拖选多个词 → 浮动“翻译”按钮 → 短语翻译
- 书库：导入/删除书、封面缩略图、记住阅读进度
- 生词本：带原句语境收藏，导出 CSV / Anki TSV

## API（摘要）

- `GET /api/status` 模型/词典就绪状态
- `GET/POST/DELETE /api/books`、`POST /api/books/upload`
- `GET /api/books/{id}/page/{n}` 页图 + 单词坐标 + 句子分组 + 难度标注
- `GET /api/books/{id}/text?chunk=k` 文本模式分块内容
- `POST /api/lookup {word}`、`POST /api/translate {text}`
- `GET/POST/DELETE /api/vocab`、`GET /api/vocab/export.csv`
- `GET/PUT /api/settings`

## 错误处理

- 模型加载中：`/api/translate` 返回 503 + 前端显示加载状态条
- 词典缺失：词义回退为模型翻译，并在词卡标注来源
- 扫描版 PDF（无文字层）：打开时检测并警告
- TXT 编码：utf-8-sig → gbk → big5 → latin-1 回退链
- 变形词还原链：精确匹配 → ECDICT exchange 字段还原 → 轻量词干规则（-s/-es/-ed/-ing/-ly 等）

## 测试计划

1. 生成两本含长难句、生词的英文示例书（一本 PDF 带文字层、一本 TXT）
2. 端点冒烟测试（lookup / translate / page / vocab）
3. 启动服务后浏览器实测：单击、双击、拖选、生词本、智能模式开关、深色模式

## 交付物

`启动阅读器.bat`（一键启动并打开浏览器）、`install.bat`（重建环境）、`README.md`、全部源码与数据目录结构。
