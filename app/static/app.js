/* ============================================================
   自动翻译阅读器 · 前端逻辑（原生 JS，无框架，100% 离线）
   ============================================================ */
"use strict";

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

const esc = s => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const WORD_JS = /([A-Za-z0-9]+(?:[\u2019'-][A-Za-z0-9]+)*)/g;
const THEMES = ["paper", "pure", "sage", "dark"];

const ICONS = {
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  volume: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  sparkle: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z"/></svg>`,
  bookOpen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
};

const S = {
  books: [], book: null,
  payload: null,          // 当前 PDF 页负载
  page: 1, chunkIdx: 0, chunksTotal: 1,
  rareSet: new Set(),
  settings: {},
  status: null,
  mouseDownI: null, suppressClick: false,
  clickTimer: null, popPos: { x: 0, y: 0 }, popCtx: null,
  selText: "", fabX: 0, fabY: 0,
  hardItems: [],
  vocab: [],
  libFilter: "all", libQuery: "",
  pdfZoom: 1,
  appending: false, sentinel: null, slotObs: null, scrollObs: null,
  progTimer: null, toastTimer: null, fontTimer: null,
};

/* ---------------- 基础工具 ---------------- */

async function api(path, body, method) {
  const opts = { method: method || (body !== undefined ? "POST" : "GET"), headers: {} };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const r = await fetch(path, opts);
  if (!r.ok) {
    let d = null;
    try { d = await r.json(); } catch (e) { /* ignore */ }
    const err = new Error((d && d.detail) || `HTTP ${r.status}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}

function toast(msg, ms) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(S.toastTimer);
  S.toastTimer = setTimeout(() => t.classList.add("hidden"), ms || 2200);
}

function fixJoin(tokens) {
  const parts = [];
  for (const t of tokens) {
    if (parts.length) {
      const prev = parts[parts.length - 1];
      if (prev.endsWith("-") && /^[a-z0-9]/.test(t)) {
        parts[parts.length - 1] = prev.slice(0, -1) + t;
        continue;
      }
    }
    parts.push(t);
  }
  return parts.join(" ")
    .replace(/\s+([,.!?;:%)\]\u201d\u2019\u00bb\u2026])/g, "$1")
    .replace(/\( /g, "(").replace(/\[ /g, "[")
    .replace(/\u201c /g, "\u201c");
}

async function copyText(text, btn) {
  let ok = false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      ok = true;
    }
  } catch (e) { ok = false; }
  if (!ok) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ok = document.execCommand("copy");
      ta.remove();
    } catch (e) { ok = false; }
  }
  if (ok && btn) {
    const old = btn.innerHTML;
    btn.classList.add("saved");
    btn.innerHTML = `${ICONS.check}<span>已复制</span>`;
    setTimeout(() => {
      if (document.body.contains(btn)) {
        btn.classList.remove("saved");
        btn.innerHTML = old;
      }
    }, 1500);
  } else if (!ok) {
    toast("复制失败，请手动选中复制");
  }
}

/* ---------------- 主题系统 ---------------- */

function getTheme() {
  const attr = document.documentElement.getAttribute("data-theme");
  return THEMES.includes(attr) ? attr : "paper";
}

function applyTheme(theme) {
  const t = THEMES.includes(theme) ? theme : "paper";
  if (t === "paper") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
  try {
    localStorage.setItem("ar-theme", t);
    if (t !== "dark") localStorage.setItem("ar-light-theme", t);
  } catch (e) { /* ignore */ }

  const isDark = t === "dark";
  const ico = isDark ? ICONS.sun : ICONS.moon;
  const label = isDark ? "切换为日间纸色" : "切换为夜灯暗纸";
  ["#btn-theme", "#btn-lib-theme"].forEach(sel => {
    const b = $(sel);
    if (b) { b.innerHTML = ico; b.title = label; }
  });
  $$(".paper-opt").forEach(o => o.classList.toggle("active", o.dataset.themeOpt === t));
  $$(".theme-card").forEach(c => c.classList.toggle("active", c.dataset.themeCard === t));
}

function toggleDayNight() {
  if (getTheme() === "dark") {
    let prev = "paper";
    try {
      const saved = localStorage.getItem("ar-light-theme");
      if (saved && saved !== "dark" && THEMES.includes(saved)) prev = saved;
    } catch (e) { /* ignore */ }
    applyTheme(prev);
  } else {
    applyTheme("dark");
  }
}

/* ---------------- 启动 ---------------- */

async function boot() {
  applyTheme(getTheme());
  S.settings = await api("/api/settings");
  applyFontSize();
  applyPdfZoom(1);
  bindEvents();
  pollStatus();
  loadVocab().catch(() => {});
  showLibrary();
}

/* ---------------- 状态轮询 ---------------- */

function syncVocabBadges(count) {
  const n = Math.max(0, Number(count) || 0);
  const badge = $("#vocab-badge");
  if (badge) {
    badge.textContent = n;
    badge.classList.toggle("hidden", n === 0);
  }
  const dc = $("#drawer-vocab-count");
  if (dc) dc.textContent = n;
}

async function pollStatus() {
  try {
    S.status = await api("/api/status");
    renderChips();
    const inReader = !$("#view-reader").classList.contains("hidden");
    const banner = $("#model-banner");
    const show = inReader && !S.status.ready;
    banner.classList.toggle("hidden", !show);
    if (!S.status.ready) setTimeout(pollStatus, 4000);
  } catch (e) {
    setTimeout(pollStatus, 6000);
  }
}

function renderChips() {
  const box = $("#status-chips");
  if (!S.status) { box.innerHTML = ""; return; }
  const st = S.status;
  const m = st.ready
    ? `<span class="chip ok"><i class="chip-dot"></i>模型就绪 · ${esc((st.device || "CPU").toUpperCase())}</span>`
    : st.loading
      ? `<span class="chip warn"><i class="chip-dot"></i>模型加载中…</span>`
      : `<span class="chip warn"><i class="chip-dot"></i>模型未就绪</span>`;
  const d = st.dict_ready
    ? `<span class="chip ok"><i class="chip-dot"></i>离线词典就绪</span>`
    : `<span class="chip warn"><i class="chip-dot"></i>词典未安装</span>`;
  const v = `<button type="button" class="chip clickable" id="chip-vocab-open" title="查看生词本">生词本 <b>${st.vocab_count}</b> 词</button>`;
  box.innerHTML = m + d + v;
  const vBtn = $("#chip-vocab-open");
  if (vBtn) vBtn.addEventListener("click", () => openDrawer("vocab"));
  syncVocabBadges(st.vocab_count);
}

/* ---------------- 书库 ---------------- */

function bookColorIndex(title) {
  let h = 0;
  const s = String(title || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 6;
}

function renderClothCover(b, compact) {
  const idx = bookColorIndex(b.title);
  const sub = b.kind === "pdf" ? `${b.pages} 页` : `${b.pages || 1} 节`;
  return `
    <div class="cover-cloth cloth-${idx}">
      <div class="cloth-body">
        <div class="cloth-top">OFFLINE FOLIO</div>
        <div class="cloth-title${compact ? " compact" : ""}">${esc(b.title)}</div>
      </div>
      <div class="cloth-ornament"><span>${esc(sub)}</span><span>${b.percent || 0}%</span></div>
    </div>`;
}

function renderContinueCard() {
  const host = $("#continue-card");
  if (!host) return;
  if (!S.books.length) {
    host.innerHTML = `
      <div class="hero-empty-state">
        <div class="hero-kicker"><span class="kicker-pill">欢迎使用</span><span>离线伴读工作台</span></div>
        <div class="hero-empty-title">把英文原版书放进您的数字书房</div>
        <div class="hero-empty-desc">支持带文字层的 PDF 原版排版与 TXT 流式阅读。在右侧拖拽导入第一本书，即可享受单击查词与本地 AI 整句翻译。</div>
        <div class="hero-actions">
          <button type="button" class="btn primary" id="btn-hero-upload">${ICONS.plus} 导入第一本书</button>
        </div>
      </div>`;
    const btn = $("#btn-hero-upload");
    if (btn) btn.addEventListener("click", () => $("#file-input").click());
    return;
  }

  const pick = S.books.find(b => b.percent > 0 && b.percent < 100)
    || S.books.find(b => b.percent > 0)
    || S.books[S.books.length - 1];

  const cover = pick.kind === "pdf" && pick.cover
    ? `<img src="${pick.cover}" alt="">`
    : renderClothCover(pick, true);

  const locLabel = pick.kind === "pdf"
    ? (pick.loc && pick.loc.page ? `上次读到第 ${pick.loc.page} 页 · 共 ${pick.pages} 页` : `共 ${pick.pages} 页`)
    : (pick.loc && pick.loc.chunk != null ? `上次读到第 ${(pick.loc.chunk || 0) + 1} 节 · 共 ${pick.pages || 1} 节` : `TXT 流式阅读`);

  host.innerHTML = `
    <div class="hero-cover-wrap">${cover}</div>
    <div class="hero-info">
      <div class="hero-kicker">
        <span class="kicker-pill">${pick.percent > 0 ? "继续阅读" : "准备就绪"}</span>
        <span>${esc(pick.kind.toUpperCase())}</span>
      </div>
      <div class="hero-book-title">${esc(pick.title)}</div>
      <div class="hero-meta-row"><span>${esc(locLabel)}</span></div>
      <div class="hero-prog-wrap">
        <div class="hero-prog-track"><div class="hero-prog-fill" style="width:${pick.percent}%"></div></div>
        <span class="hero-prog-pct">${pick.percent}%</span>
      </div>
      <div class="hero-actions">
        <button type="button" class="btn primary" id="btn-hero-open">${ICONS.bookOpen} ${pick.percent > 0 ? "继续阅读" : "开始阅读"}</button>
      </div>
    </div>`;
  $("#btn-hero-open").addEventListener("click", () => openBook(pick.id));
}

function renderBookGrid() {
  const grid = $("#book-grid");
  const countEl = $("#book-count");
  if (countEl) countEl.textContent = `${S.books.length} 本`;

  grid.innerHTML = "";
  if (!S.books.length) {
    grid.innerHTML = `<div class="shelf-empty">书架还是空的，先导入一本 PDF 或 TXT 吧</div>`;
    return;
  }

  const q = S.libQuery.trim().toLowerCase();
  const filtered = S.books.filter(b => {
    if (S.libFilter !== "all" && b.kind !== S.libFilter) return false;
    if (q && !b.title.toLowerCase().includes(q)) return false;
    return true;
  });

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="shelf-empty">
        <div>没有找到符合条件的书籍</div>
        <button type="button" class="btn soft" id="btn-clear-filter">清除筛选条件</button>
      </div>`;
    $("#btn-clear-filter").addEventListener("click", () => {
      S.libFilter = "all";
      S.libQuery = "";
      $("#book-search").value = "";
      $$(".seg-tab").forEach(t => t.classList.toggle("active", t.dataset.filter === "all"));
      renderBookGrid();
    });
    return;
  }

  filtered.forEach((b, i) => {
    const card = document.createElement("div");
    card.className = "book-card";
    card.style.animationDelay = Math.min(i * 45, 360) + "ms";
    const cover = b.kind === "pdf" && b.cover
      ? `<img src="${b.cover}" alt="">`
      : renderClothCover(b, false);
    const subText = b.kind === "pdf" ? `${b.pages} 页` : `TXT · ${b.pages || 1} 节`;

    card.innerHTML = `
      <div class="cover">
        ${cover}
        <span class="kind-badge">${b.kind.toUpperCase()}</span>
        <button type="button" class="book-del" title="从书架移除" aria-label="从书架移除">${ICONS.trash}</button>
        <span class="cover-hover-cta">打开阅读</span>
      </div>
      <div class="book-meta">
        <div class="book-title" title="${esc(b.title)}">${esc(b.title)}</div>
        <div class="book-sub">
          <span>${esc(subText)}</span>
          <span>${b.percent}%</span>
        </div>
        <div class="progress"><i style="width:${b.percent}%"></i></div>
      </div>`;

    card.addEventListener("click", () => openBook(b.id));
    card.querySelector(".book-del").addEventListener("click", async ev => {
      ev.stopPropagation();
      if (!confirm(`把《${b.title}》从书架移除？（不会删除通过路径打开的原始文件）`)) return;
      try {
        await api(`/api/books/${b.id}`, undefined, "DELETE");
        showLibrary();
        toast("已从书架移除");
      } catch (e) { toast(e.message); }
    });
    grid.appendChild(card);
  });
}

async function showLibrary() {
  $("#view-library").classList.remove("hidden");
  $("#view-reader").classList.add("hidden");
  closeDrawer();
  closePaperPopover();
  $("#model-banner").classList.add("hidden");
  try {
    S.books = await api("/api/books");
  } catch (e) {
    toast("书库加载失败：" + e.message);
    return;
  }
  renderContinueCard();
  renderBookGrid();
}

async function uploadFiles(files) {
  for (const f of files) {
    toast(`正在导入《${f.name}》…`, 10000);
    const fd = new FormData();
    fd.append("file", f);
    try {
      const r = await fetch("/api/books/upload", { method: "POST", body: fd });
      if (!r.ok) {
        const d = await r.json().catch(() => null);
        throw new Error((d && d.detail) || `导入失败 (${r.status})`);
      }
      toast(`《${f.name}》导入成功`);
    } catch (e) {
      toast(`《${f.name}》导入失败：${e.message}`, 4000);
    }
  }
  showLibrary();
}

/* ---------------- 打开书籍与阅读进度 ---------------- */

function updateReaderMeta() {
  if (!S.book) return;
  const kindEl = $("#reader-kind-badge");
  if (kindEl) kindEl.textContent = S.book.kind.toUpperCase();

  let pct = 0, label = "";
  if (S.book.kind === "pdf") {
    const total = Math.max(1, (S.payload && S.payload.total) || S.book.pages || 1);
    const cur = Math.min(total, Math.max(1, S.page || 1));
    pct = Math.min(100, Math.round((cur / total) * 100));
    label = `第 ${cur} / ${total} 页 · ${pct}%`;
    const atStart = cur <= 1, atEnd = cur >= total;
    $("#btn-prev").disabled = atStart;
    $("#btn-next").disabled = atEnd;
    $("#btn-pdf-edge-prev").disabled = atStart;
    $("#btn-pdf-edge-next").disabled = atEnd;
  } else {
    const total = Math.max(1, S.chunksTotal || S.book.pages || 1);
    const cur = Math.min(total, (S.chunkIdx || 0) + 1);
    pct = Math.min(100, Math.round((cur / total) * 100));
    label = `第 ${cur} / ${total} 节 · ${pct}%`;
    $("#btn-chunk-prev").disabled = S.chunkIdx <= 0;
    $("#btn-chunk-next").disabled = S.chunkIdx + 1 >= S.chunksTotal;
  }

  const pt = $("#reader-progress-text");
  if (pt) pt.textContent = label;
  const pf = $("#reader-progress-fill");
  if (pf) pf.style.width = pct + "%";
}

function applyPdfZoom(z) {
  S.pdfZoom = Math.round(Math.min(1.45, Math.max(0.75, z)) * 100) / 100;
  document.documentElement.style.setProperty("--pdf-zoom", String(S.pdfZoom));
  const zv = $("#pdf-zoom-val");
  if (zv) zv.textContent = Math.round(S.pdfZoom * 100) + "%";
}

async function openBook(id) {
  try { S.book = await api(`/api/books/${id}`); }
  catch (e) { toast(e.message); return; }
  S.hardItems = [];
  S.payload = null;
  hidePopup(); hideFab(); closePaperPopover();
  $("#reader-title").textContent = S.book.title;
  $("#view-library").classList.add("hidden");
  $("#view-reader").classList.remove("hidden");
  window.scrollTo(0, 0);
  if (S.book.kind === "pdf") {
    $("#text-article").classList.add("hidden");
    $("#pdf-container").classList.remove("hidden");
    $("#text-foot").classList.add("hidden");
    $("#pdf-foot").classList.remove("hidden");
    S.page = Math.max(1, (S.book.loc && S.book.loc.page) || 1);
    await loadPage(S.page);
  } else {
    $("#pdf-container").classList.add("hidden");
    $("#text-article").classList.remove("hidden");
    $("#pdf-foot").classList.add("hidden");
    $("#text-foot").classList.remove("hidden");
    $("#text-article").innerHTML = "";
    S.chunkIdx = Math.max(0, (S.book.loc && S.book.loc.chunk) || 0);
    await loadChunk(S.chunkIdx, false);
  }
  updateReaderMeta();
  saveProgressDebounced();
  refreshSmartView();
}

function closeBook() {
  S.book = null;
  $("#text-article").innerHTML = "";
  showLibrary();
}

/* ---------------- PDF 页面 ---------------- */

async function loadPage(n) {
  if (!S.book) return;
  try { S.payload = await api(`/api/books/${S.book.id}/page/${n}`); }
  catch (e) { toast(e.message); return; }
  S.page = S.payload.page;
  renderPdfPage();
  $("#page-total").textContent = S.payload.total;
  $("#page-jump").value = S.page;
  $("#page-jump").max = S.payload.total;
  updateReaderMeta();
  saveProgressDebounced();
}

function renderPdfPage() {
  const host = $("#pdf-page");
  host.innerHTML = "";
  const img = new Image();
  img.className = "page-img";
  img.alt = "";
  img.src = S.payload.img;
  host.appendChild(img);
  const frag = document.createDocumentFragment();
  for (const w of S.payload.words) {
    const d = document.createElement("div");
    d.className = "w" + (w.rare ? " rare" : "");
    d.dataset.i = w.i;
    d.dataset.t = w.t;
    d.dataset.s = w.s;
    d.style.left = (w.x * 100) + "%";
    d.style.top = (w.y * 100) + "%";
    d.style.width = (w.w * 100) + "%";
    d.style.height = (w.h * 100) + "%";
    frag.appendChild(d);
  }
  host.appendChild(frag);
}

function buildPdfHardMarks() {
  $$("#pdf-page .hard-mark").forEach(m => m.remove());
  if (!S.payload) return;
  const hardIds = new Set(S.payload.sents.filter(s => s.hard).map(s => s.id));
  if (!hardIds.size) return;
  const byLine = new Map();
  for (const w of S.payload.words) {
    if (!hardIds.has(w.s)) continue;
    const key = w.s + ":" + Math.round(w.y * 90);
    let g = byLine.get(key);
    if (!g) { g = { s: w.s, x: w.x, y: w.y, y2: w.y + w.h }; byLine.set(key, g); }
    else {
      g.x = Math.min(g.x, w.x);
      g.y = Math.min(g.y, w.y);
      g.y2 = Math.max(g.y2, w.y + w.h);
    }
  }
  const host = $("#pdf-page");
  for (const g of byLine.values()) {
    const m = document.createElement("div");
    m.className = "hard-mark";
    m.dataset.s = g.s;
    m.style.left = Math.max(0.002, g.x - 0.018) * 100 + "%";
    m.style.top = (g.y * 100) + "%";
    m.style.height = ((g.y2 - g.y) * 100) + "%";
    host.appendChild(m);
  }
}

async function pageNext() {
  if (S.payload && S.page < S.payload.total) {
    window.scrollTo(0, 0);
    await loadPage(S.page + 1);
    refreshSmartView();
  }
}
async function pagePrev() {
  if (S.payload && S.page > 1) {
    window.scrollTo(0, 0);
    await loadPage(S.page - 1);
    refreshSmartView();
  }
}

/* ---------------- TXT 分节 ---------------- */

async function loadChunk(k, append) {
  if (!S.book) return;
  let data;
  try { data = await api(`/api/books/${S.book.id}/text?chunk=${k}`); }
  catch (e) { toast(e.message); return; }
  S.chunkIdx = data.chunk;
  S.chunksTotal = data.total_chunks;
  S.rareSet = new Set(data.rare);
  const art = $("#text-article");
  if (!append) art.innerHTML = "";
  const frag = document.createDocumentFragment();
  for (const para of data.paragraphs) {
    const pEl = document.createElement("p");
    pEl.className = "para";
    for (const s of para.sents) {
      const sEl = document.createElement("span");
      sEl.className = "sent";
      sEl.dataset.text = s.text;
      if (s.hard) sEl.dataset.hard = "1";
      appendSentenceTokens(sEl, s.text);
      pEl.appendChild(sEl);
      pEl.appendChild(document.createTextNode(" "));
      if (s.hard) {
        const slot = document.createElement("span");
        slot.className = "tr-slot";
        slot.dataset.text = s.text;
        pEl.appendChild(slot);
      }
    }
    frag.appendChild(pEl);
  }
  art.appendChild(frag);
  $("#chunk-indicator").textContent = `${S.chunkIdx + 1} / ${S.chunksTotal}`;
  updateReaderMeta();
  moveSentinel();
  observeSlots();
  saveProgressDebounced();
  if (!append) window.scrollTo(0, 0);
  refreshSmartView();
}

function appendSentenceTokens(sEl, text) {
  let last = 0, m;
  WORD_JS.lastIndex = 0;
  while ((m = WORD_JS.exec(text)) !== null) {
    if (m.index > last) sEl.appendChild(document.createTextNode(text.slice(last, m.index)));
    const sp = document.createElement("span");
    sp.className = "w" + (S.rareSet.has(m[1].toLowerCase()) ? " rare" : "");
    sp.dataset.t = m[1];
    sp.textContent = m[1];
    sEl.appendChild(sp);
    last = m.index + m[1].length;
  }
  if (last < text.length) sEl.appendChild(document.createTextNode(text.slice(last)));
}

function moveSentinel() {
  const art = $("#text-article");
  if (!S.sentinel) S.sentinel = document.createElement("div");
  S.sentinel.id = "load-sentinel";
  S.sentinel.style.height = "10px";
  art.appendChild(S.sentinel);
  if (!S.scrollObs) {
    S.scrollObs = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      if (!S.book || S.book.kind !== "txt" || S.appending) return;
      if (S.chunkIdx + 1 >= S.chunksTotal) return;
      S.appending = true;
      loadChunk(S.chunkIdx + 1, true).finally(() => { S.appending = false; });
    }, { rootMargin: "700px 0px" });
  }
  S.scrollObs.unobserve(S.sentinel);
  S.scrollObs.observe(S.sentinel);
}

function observeSlots() {
  if (!S.slotObs) {
    S.slotObs = new IntersectionObserver(entries => {
      if (!S.settings.smart_mode || !S.settings.auto_translate_hard) return;
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        const slot = en.target;
        if (slot.textContent || slot.dataset.queued) continue;
        slot.dataset.queued = "1";
        queueTranslate(slot.dataset.text, trans => {
          if (trans != null) fillSlots(slot.dataset.text, trans);
        });
      }
    }, { rootMargin: "300px 0px" });
  }
  $$("#text-article .tr-slot").forEach(s => S.slotObs.observe(s));
}

function fillSlots(text, trans) {
  $$("#text-article .tr-slot").forEach(slot => {
    if (slot.dataset.text === text && !slot.textContent) slot.textContent = trans;
  });
  $$("#pdf-page .hard-mark").forEach(m => {
    const s = S.payload && S.payload.sents[m.dataset.s];
    if (s && s.text === text) m.classList.add("done");
  });
}

/* ---------------- 翻译队列 ---------------- */

const transQueue = [];
let pumping = false;

function queueTranslate(text, cb) {
  transQueue.push({ text, cb });
  pump();
}

async function pump() {
  if (pumping) return;
  pumping = true;
  while (transQueue.length) {
    const job = transQueue.shift();
    try {
      const r = await api("/api/translate", { text: job.text });
      job.cb(r.translation, null, r);
    } catch (e) {
      job.cb(null, e);
      if (e.status === 503) pollStatus();
    }
  }
  pumping = false;
}

/* ---------------- 智能模式 ---------------- */

function applyBodyClasses() {
  document.body.classList.toggle("smart", !!S.settings.smart_mode);
  document.body.classList.toggle("underline", !!S.settings.underline_rare);
  document.body.classList.toggle("auto", !!S.settings.auto_translate_hard);
  $("#btn-smart").classList.toggle("on", !!S.settings.smart_mode);
}

function refreshSmartView() {
  applyBodyClasses();
  if (S.book && S.book.kind === "pdf") buildPdfHardMarks();
  if (!S.book || !S.settings.smart_mode) {
    S.hardItems = [];
    renderHardPanel();
    return;
  }
  const items = [];
  const seen = new Set();
  if (S.book.kind === "pdf" && S.payload) {
    for (const s of S.payload.sents) {
      if (s.hard && !seen.has(s.text)) { seen.add(s.text); items.push({ text: s.text }); }
    }
  } else {
    $$("#text-article .sent[data-hard]").forEach(el => {
      if (!seen.has(el.dataset.text)) { seen.add(el.dataset.text); items.push({ text: el.dataset.text }); }
    });
  }
  S.hardItems = items.map(it => ({ ...it, trans: null, state: "pending" }));
  renderHardPanel();
  if (S.settings.smart_mode && S.settings.auto_translate_hard) autoTranslateHard();
}

async function autoTranslateHard() {
  for (const it of S.hardItems) {
    if (!S.settings.smart_mode || !S.settings.auto_translate_hard) return;
    if (it.state !== "pending") continue;
    it.state = "loading";
    renderHardPanel();
    queueTranslate(it.text, trans => {
      if (trans != null) {
        it.trans = trans;
        it.state = "done";
        fillSlots(it.text, trans);
      } else it.state = "error";
      renderHardPanel();
    });
    await new Promise(res => setTimeout(res, 60));
  }
}

function locateHardSentence(text) {
  if (S.book && S.book.kind === "txt") {
    const target = $$("#text-article .sent").find(el => el.dataset.text === text);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("sent-flash");
      setTimeout(() => target.classList.remove("sent-flash"), 1800);
    }
  } else if (S.book && S.book.kind === "pdf" && S.payload) {
    const sObj = S.payload.sents.find(s => s.text === text);
    if (sObj) {
      const marks = $$(`#pdf-page .hard-mark[data-s="${sObj.id}"]`);
      if (marks.length) {
        marks[0].scrollIntoView({ behavior: "smooth", block: "center" });
        marks.forEach(m => m.classList.add("flash"));
        setTimeout(() => marks.forEach(m => m.classList.remove("flash")), 1800);
      }
    }
  }
}

function renderHardPanel() {
  const list = $("#hard-list");
  const summary = $("#hard-summary");
  const hc = $("#drawer-hard-count");
  const hb = $("#hard-badge");
  const hq = $("#btn-hard-quick");

  const n = S.hardItems.length;
  if (hc) hc.textContent = n;
  if (hb) hb.textContent = n;
  if (hq) hq.classList.toggle("hidden", !S.settings.smart_mode || n === 0);

  if (!list) return;
  if (!n) {
    if (summary) summary.classList.add("hidden");
    list.innerHTML = `<div class="hard-empty">${S.settings.smart_mode ? "本页暂无长难句 ✓" : "开启顶栏「智能」后，此处将自动列出当前页面的长难句"}</div>`;
    return;
  }

  const doneCount = S.hardItems.filter(it => it.state === "done").length;
  if (summary) {
    summary.classList.remove("hidden");
    summary.innerHTML = `<span>本页共 <b>${n}</b> 句长难句</span><span>已译 ${doneCount} / ${n} · 点击卡片定位</span>`;
  }

  list.innerHTML = "";
  S.hardItems.forEach((it, idx) => {
    const div = document.createElement("div");
    div.className = "hard-item" + (it.state === "done" ? " done" : "");
    const zh = it.state === "done"
      ? `<div class="zh">${esc(it.trans)}</div>`
      : it.state === "loading"
        ? `<div class="zh loading">翻译中…</div>`
        : it.state === "error"
          ? `<div class="zh loading" style="color:var(--accent)">翻译失败，可点击重试</div>`
          : "";
    const actionBtn = it.state === "done"
      ? `<button type="button" class="btn soft act-copy">${ICONS.copy}<span>复制</span></button>`
      : it.state === "loading"
        ? `<span style="font-size:.74rem;color:var(--muted)">排队译句…</span>`
        : `<button type="button" class="btn primary act-tr">${ICONS.sparkle}<span>译句</span></button>`;

    div.innerHTML = `
      <div class="hard-item-head">
        <span class="hard-idx">${String(idx + 1).padStart(2, "0")}</span>
        <span style="font-size:.72rem;color:var(--muted)">${it.state === "done" ? "已译" : "待译"}</span>
      </div>
      <div class="en">${esc(it.text)}</div>
      ${zh}
      <div class="row">
        <span style="font-size:.72rem;color:var(--muted)">点击定位原文</span>
        ${actionBtn}
      </div>`;

    div.addEventListener("click", ev => {
      if (ev.target.closest("button")) return;
      locateHardSentence(it.text);
    });

    const trBtn = div.querySelector(".act-tr");
    if (trBtn) trBtn.addEventListener("click", ev => {
      ev.stopPropagation();
      it.state = "loading";
      renderHardPanel();
      queueTranslate(it.text, trans => {
        if (trans != null) { it.trans = trans; it.state = "done"; fillSlots(it.text, trans); }
        else it.state = "error";
        renderHardPanel();
      });
    });

    const cpBtn = div.querySelector(".act-copy");
    if (cpBtn) cpBtn.addEventListener("click", ev => {
      ev.stopPropagation();
      copyText(it.trans, cpBtn);
    });

    list.appendChild(div);
  });
}

/* ---------------- 词卡 / 句卡 ---------------- */

function sentenceTextOf(el) {
  if (S.book && S.book.kind === "pdf" && S.payload) {
    const s = S.payload.sents[el.dataset.s];
    if (s) return s.text;
    return el.dataset.t;
  }
  const sent = el.closest(".sent");
  return sent ? sent.dataset.text : el.dataset.t;
}

function showPopupCard(x, y, html, isSent) {
  const pop = $("#popup");
  pop.classList.toggle("is-sent", !!isSent);
  pop.innerHTML = html;
  pop.classList.remove("hidden");
  pop.style.visibility = "hidden";
  pop.style.left = "0px";
  pop.style.top = "0px";
  S.popPos = { x, y };
  requestAnimationFrame(() => {
    const r = pop.getBoundingClientRect();
    let L = Math.min(Math.max(12, x + 16), window.innerWidth - r.width - 14);
    let T = y + 18;
    if (T + r.height > window.innerHeight - 14) T = Math.max(12, y - r.height - 14);
    pop.style.left = L + "px";
    pop.style.top = T + "px";
    pop.style.visibility = "visible";
    pop.classList.remove("pop-in");
    void pop.offsetWidth;
    pop.classList.add("pop-in");
  });
}

function hidePopup() { $("#popup").classList.add("hidden"); }

function formatTranslationHtml(raw) {
  const lines = String(raw || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (!lines.length) return `<div style="color:var(--muted)">（无中文释义）</div>`;
  return lines.map(line => {
    const m = line.match(/^([a-zA-Z]{1,8}\.|\[[^\]]{1,12}\])\s+(.+)$/);
    if (m) {
      return `<div class="pos-row"><span class="pos-badge">${esc(m[1])}</span><span class="pos-meaning">${esc(m[2])}</span></div>`;
    }
    return `<div>${esc(line)}</div>`;
  }).join("");
}

function tagClass(t) {
  const s = String(t || "").toLowerCase();
  if (s.includes("四") || s.includes("六") || s.includes("cet") || s.includes("高") || s.includes("中")) return "tag-cet";
  if (s.includes("研") || s.includes("ky")) return "tag-grad";
  if (s.includes("雅") || s.includes("托") || s.includes("ielts") || s.includes("toefl")) return "tag-ielts";
  if (s.includes("gre")) return "tag-gre";
  return "";
}

function renderCollinsStars(n) {
  const filled = Math.min(5, Math.max(0, Number(n) || 0));
  if (!filled) return "";
  return `<span class="tag star" title="柯林斯星级 ${filled}/5">柯林斯 <span class="star-dots">${"★".repeat(filled)}<span class="star-dim">${"★".repeat(5 - filled)}</span></span></span>`;
}

async function showWordPopup(el, ev, word) {
  const ctx = sentenceTextOf(el);
  showPopupCard(ev.clientX, ev.clientY, `
    <button type="button" class="pop-close" data-act="close" aria-label="关闭">${ICONS.close}</button>
    <div class="pop-head"><span class="pop-word">${esc(word)}</span></div>
    <div class="shimmer-stack" style="margin-top:12px">
      <div class="shimmer-line"></div>
      <div class="shimmer-line short"></div>
    </div>`, false);
  let d;
  try { d = await api("/api/lookup", { word }); }
  catch (e) { showPopupError(e); return; }
  if (!d || !d.found) return renderWordNotFound(word, d, ctx);
  renderWordCard(d, ctx);
}

function renderWordNotFound(word, d, ctx) {
  const zipf = d && d.zipf != null ? d.zipf : null;
  const freqPct = zipf != null ? Math.max(6, Math.min(100, Math.round(((zipf - 1.5) / 5.5) * 100))) : 0;
  const freq = zipf != null
    ? `<div class="pop-freq-bar"><span>词频 Zipf ${zipf}（越低越罕见）</span><span class="freq-meter"><i style="width:${freqPct}%"></i></span></div>` : "";
  showPopupCard(S.popPos.x, S.popPos.y, `
    <button type="button" class="pop-close" data-act="close" aria-label="关闭">${ICONS.close}</button>
    <div class="pop-head">
      <span class="pop-word">${esc(word)}</span>
    </div>
    <div class="pop-trans" style="color:var(--muted)">离线词典暂未收录该词形</div>
    ${freq}
    <div class="pop-actions">
      <button type="button" class="btn primary" data-act="modeltr">${ICONS.sparkle} 用翻译模型试试</button>
    </div>`, false);
  S.popCtx = { kind: "notfound", word, ctx };
}

function renderWordCard(d, ctx) {
  const lemma = d.word && d.word.toLowerCase() !== d.query.toLowerCase()
    ? `<span class="pop-lemma">→ 原形 <b>${esc(d.word)}</b></span>` : "";
  const stars = renderCollinsStars(d.collins);
  const tags = (d.tags || []).map(t => `<span class="tag ${tagClass(t)}">${esc(t)}</span>`).join("");
  const phonHtml = d.phonetic ? `<span class="pop-phon">/${esc(d.phonetic)}/</span>` : "";
  const def = d.definition ? `<div class="pop-def">${esc(d.definition)}</div>` : "";

  const freqBits = [];
  if (d.frq) freqBits.push(`当代词频 #${d.frq}`);
  if (d.zipf != null) freqBits.push(`Zipf ${d.zipf}`);
  const zipfPct = d.zipf != null ? Math.max(8, Math.min(100, Math.round(((d.zipf - 1.5) / 5.5) * 100))) : 50;
  const freq = freqBits.length
    ? `<div class="pop-freq-bar"><span>${esc(freqBits.join(" · "))}</span><span class="freq-meter" title="常用程度"><i style="width:${zipfPct}%"></i></span></div>`
    : "";

  const isSaved = S.vocab.some(v => v.word === d.query.toLowerCase());
  const saveCls = isSaved ? "btn saved" : "btn";
  const saveLabel = isSaved ? `${ICONS.check} 已在生词本` : `${ICONS.plus} 收进生词本`;

  showPopupCard(S.popPos.x, S.popPos.y, `
    <button type="button" class="pop-close" data-act="close" aria-label="关闭">${ICONS.close}</button>
    <div class="pop-head">
      <span class="pop-word">${esc(d.query)}</span>${lemma}
    </div>
    <div class="pop-phon-row">
      ${phonHtml}
      <button type="button" class="pop-speak-btn" data-act="tts" title="朗读发音" aria-label="朗读发音">${ICONS.volume}</button>
    </div>
    ${stars || tags ? `<div class="pop-tags">${stars}${tags}</div>` : ""}
    <div class="pop-trans pos-list">${formatTranslationHtml(d.translation)}</div>
    ${def}
    ${freq}
    <div class="pop-actions">
      <button type="button" class="${saveCls}" data-act="save">${saveLabel}</button>
      <button type="button" class="btn primary" data-act="sent">${ICONS.sparkle} 译整句</button>
    </div>`, false);
  S.popCtx = { kind: "word", word: d.query, entry: d, ctx };
}

function showPopupError(e) {
  $("#popup").innerHTML = `
    <button type="button" class="pop-close" data-act="close" aria-label="关闭">${ICONS.close}</button>
    <div class="pop-err">${ICONS.alert}<span>${esc(e.message || "请求失败")}</span></div>`;
}

async function translateViaModel(word) {
  showPopupCard(S.popPos.x, S.popPos.y, `
    <button type="button" class="pop-close" data-act="close" aria-label="关闭">${ICONS.close}</button>
    <div class="pop-head"><span class="pop-word">${esc(word)}</span></div>
    <div class="shimmer-stack" style="margin-top:12px">
      <div class="shimmer-line"></div>
      <div class="shimmer-line short"></div>
    </div>`, true);
  let r;
  try { r = await api("/api/translate", { text: word }); }
  catch (e) {
    if (e.status === 503) {
      pollStatus();
      showPopupCard(S.popPos.x, S.popPos.y, `
        <button type="button" class="pop-close" data-act="close" aria-label="关闭">${ICONS.close}</button>
        <div class="pop-trans">${esc(word)}</div>
        <div class="badge-503">翻译模型正在加载，稍等几秒再试。</div>`, true);
      return;
    }
    showPopupError(e); return;
  }
  showPopupCard(S.popPos.x, S.popPos.y, `
    <button type="button" class="pop-close" data-act="close" aria-label="关闭">${ICONS.close}</button>
    <div class="pop-head"><span class="pop-word">${esc(word)}</span></div>
    <div class="pop-lemma" style="margin-top:6px">模型直译（未收录于词典）</div>
    <div class="pop-trans" style="margin-top:10px;font-weight:500">${esc(r.translation || "（无结果）")}</div>
    <div class="pop-actions">
      <button type="button" class="btn" data-act="save">${ICONS.plus} 收进生词本</button>
    </div>`, true);
  S.popCtx = { kind: "modelword", word, trans: r.translation, ctx: S.popCtx ? S.popCtx.ctx : "" };
}

function showSentencePopupText(text, x, y, kicker) {
  const title = kicker || "整句翻译";
  showPopupCard(x, y, `
    <button type="button" class="pop-close" data-act="close" aria-label="关闭">${ICONS.close}</button>
    <div class="pop-kicker">${esc(title)}</div>
    <div class="pop-src-original">${esc(text)}</div>
    <div class="shimmer-stack">
      <div class="shimmer-line"></div>
      <div class="shimmer-line"></div>
      <div class="shimmer-line short"></div>
    </div>`, true);
  api("/api/translate", { text })
    .then(r => {
      const tr = r.translation || "（无结果）";
      showPopupCard(S.popPos.x, S.popPos.y, `
        <button type="button" class="pop-close" data-act="close" aria-label="关闭">${ICONS.close}</button>
        <div class="pop-kicker">${esc(title)}</div>
        <div class="pop-src-original">${esc(text)}</div>
        <div class="pop-translation">${esc(tr)}</div>
        <div class="pop-foot-meta">
          <div class="pop-meta">${r.cached
            ? `<span class="cached">✓ 译文缓存 · 零延迟</span>`
            : `本地首译用时 ${r.seconds}s`}</div>
          <button type="button" class="btn soft pop-copy-btn" data-act="copy">${ICONS.copy}<span>复制译文</span></button>
        </div>`, true);
      S.popCtx = { kind: "sentence", text, trans: tr };
    })
    .catch(e => {
      if (e.status === 503) {
        pollStatus();
        $("#popup").innerHTML = `
          <button type="button" class="pop-close" data-act="close" aria-label="关闭">${ICONS.close}</button>
          <div class="pop-kicker">${esc(title)}</div>
          <div class="pop-src-original">${esc(text)}</div>
          <div class="badge-503">翻译模型正在加载，稍等几秒再试。</div>`;
      } else {
        showPopupError(e);
      }
    });
}

/* ---------------- 选择短语 ---------------- */

function showSelectionFab(x, y, text) {
  const fab = $("#sel-fab");
  S.selText = text;
  fab.classList.remove("hidden");
  const L = Math.min(Math.max(10, x + 8), window.innerWidth - 114);
  const T = Math.min(Math.max(10, y - 48), window.innerHeight - 50);
  fab.style.left = L + "px";
  fab.style.top = T + "px";
}

function hideFab() { $("#sel-fab").classList.add("hidden"); }

/* ---------------- 生词本与侧栏 ---------------- */

function openDrawer(tab) {
  $("#drawer").classList.remove("hidden");
  $("#drawer-backdrop").classList.remove("hidden");
  switchDrawerTab(tab || "vocab");
  if (tab === "vocab" || !tab) loadVocab();
}

function closeDrawer() {
  $("#drawer").classList.add("hidden");
  $("#drawer-backdrop").classList.add("hidden");
}

function switchDrawerTab(tab) {
  $$(".drawer-tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  $("#drawer-vocab").classList.toggle("hidden", tab !== "vocab");
  $("#drawer-hard").classList.toggle("hidden", tab !== "hard");
}

async function loadVocab() {
  try { S.vocab = await api("/api/vocab"); }
  catch (e) { toast(e.message); return; }
  if (S.status) S.status.vocab_count = S.vocab.length;
  renderVocab();
  renderChips();
}

function renderVocab() {
  const q = ($("#vocab-search").value || "").trim().toLowerCase();
  const list = $("#vocab-list");
  syncVocabBadges(S.vocab.length);

  const items = S.vocab.filter(v =>
    !q || v.word.includes(q) || (v.translation || "").toLowerCase().includes(q));
  if (!items.length) {
    list.innerHTML = `<div class="vocab-empty">${S.vocab.length ? "没有匹配的词条" : "生词本还是空的。<br>查词时点「＋ 收进生词本」即可收藏。"}</div>`;
    return;
  }
  list.innerHTML = "";
  for (const v of items) {
    const div = document.createElement("div");
    div.className = "vocab-item";
    div.innerHTML = `
      <div class="vocab-word">
        <span>${esc(v.word)}</span>
        ${v.phonetic ? `<span class="ph">/${esc(v.phonetic)}/</span>` : ""}
        <span class="vocab-acts">
          <button type="button" class="vocab-ico-btn speak" title="朗读发音" aria-label="朗读发音">${ICONS.volume}</button>
          <button type="button" class="vocab-ico-btn del" title="删除" aria-label="删除">${ICONS.trash}</button>
        </span>
      </div>
      <div class="vocab-trans">${esc((v.translation || "").split("\n")[0] || "")}</div>
      ${v.context ? `<div class="vocab-ctx" title="${esc(v.context)}">${esc(v.context)}</div>` : ""}
      ${v.book ? `<div class="vocab-book-tag" title="${esc(v.book)}">${esc(v.book)}</div>` : ""}`;

    div.querySelector(".speak").addEventListener("click", () => {
      api("/api/tts", { word: v.word }).catch(() => {});
    });
    div.querySelector(".del").addEventListener("click", async () => {
      try {
        await api(`/api/vocab/${encodeURIComponent(v.word)}`, undefined, "DELETE");
        await loadVocab();
        renderChips();
      } catch (e) { toast(e.message); }
    });
    list.appendChild(div);
  }
}

async function saveToVocab(word, phonetic, translation, context, saveBtn) {
  try {
    await api("/api/vocab", {
      word, phonetic: phonetic || "", translation: translation || "",
      context: context || "", book: S.book ? S.book.title : "",
    });
    if (saveBtn) {
      saveBtn.classList.add("saved");
      saveBtn.innerHTML = `${ICONS.check} 已收藏`;
    }
    toast(`「${word}」已收进生词本`);
    await loadVocab();
  } catch (e) { toast("收藏失败：" + e.message); }
}

/* ---------------- 设置 ---------------- */

function syncSubRows() {
  const on = $("#set-smart").checked;
  ["#row-underline", "#row-auto"].forEach(sel => {
    const r = $(sel);
    if (r) r.classList.toggle("dimmed", !on);
  });
}

function openSettings() {
  const s = S.settings;
  $("#set-smart").checked = !!s.smart_mode;
  $("#set-underline").checked = !!s.underline_rare;
  $("#set-auto").checked = !!s.auto_translate_hard;
  $("#set-zipf").value = s.rare_zipf;
  $("#set-hardlen").value = s.hard_len;
  $("#set-font").value = s.font_size;
  syncSubRows();
  updateZipfLabel();
  applyTheme(getTheme());
  $("#settings-overlay").classList.remove("hidden");
}

function updateZipfLabel() {
  const el = $("#set-zipf");
  const v = parseFloat(el.value);
  const pct = Math.min(100, Math.max(0, ((v - 3) / 1.2) * 100));
  el.style.setProperty("--range-pct", pct.toFixed(1) + "%");
  const desc = v >= 3.95 ? "较多标注" : v <= 3.2 ? "只标最生僻" : "平衡";
  $("#set-zipf-v").textContent = `低于词频 ${v.toFixed(2)} 视为生词（${desc}）`;
}

async function saveSettings() {
  const patch = {
    smart_mode: $("#set-smart").checked,
    underline_rare: $("#set-underline").checked,
    auto_translate_hard: $("#set-auto").checked,
    rare_zipf: parseFloat($("#set-zipf").value),
    hard_len: parseInt($("#set-hardlen").value, 10) || 28,
    font_size: parseInt($("#set-font").value, 10) || 19,
  };
  $("#settings-overlay").classList.add("hidden");
  try { S.settings = await api("/api/settings", patch, "PUT"); }
  catch (e) { toast("保存失败：" + e.message); return; }
  applyFontSize();
  refreshSmartView();
  if (S.book && S.book.kind === "pdf") await loadPage(S.page);
  else if (S.book) await loadChunk(S.chunkIdx, false);
  toast("设置已保存");
}

function applyFontSize() {
  const fs = S.settings.font_size || 19;
  document.documentElement.style.setProperty("--fs", fs + "px");
  const badge = $("#font-size-badge");
  if (badge) badge.textContent = fs + "px";
}

async function nudgeFont(delta) {
  const cur = S.settings.font_size || 19;
  const v = Math.min(26, Math.max(15, cur + delta));
  if (v === cur) return;
  S.settings.font_size = v;
  applyFontSize();
  clearTimeout(S.fontTimer);
  S.fontTimer = setTimeout(() => {
    api("/api/settings", { font_size: v }, "PUT").catch(() => {});
  }, 800);
}

/* ---------------- 纸色弹出层 ---------------- */

function closePaperPopover() {
  const p = $("#paper-popover");
  const b = $("#btn-paper-menu");
  if (p) p.classList.add("hidden");
  if (b) b.setAttribute("aria-expanded", "false");
}

/* ---------------- 事件绑定 ---------------- */

function bindEvents() {
  // 书库上传与拖拽
  $("#file-input").addEventListener("change", ev => {
    if (ev.target.files && ev.target.files.length) uploadFiles(ev.target.files);
    ev.target.value = "";
  });

  const dz = $("#drop-zone");
  if (dz) {
    ["dragenter", "dragover"].forEach(evt => dz.addEventListener(evt, ev => {
      ev.preventDefault();
      dz.classList.add("drag-over");
    }));
    ["dragleave", "drop"].forEach(evt => dz.addEventListener(evt, ev => {
      ev.preventDefault();
      dz.classList.remove("drag-over");
    }));
    dz.addEventListener("drop", ev => {
      const files = ev.dataTransfer && ev.dataTransfer.files;
      if (files && files.length) uploadFiles(files);
    });
  }

  $("#path-form").addEventListener("submit", async ev => {
    ev.preventDefault();
    const p = $("#path-input").value.trim();
    if (!p) return;
    toast("正在打开…", 6000);
    try {
      await api("/api/books/path", { path: p });
      $("#path-input").value = "";
      await showLibrary();
      toast("打开成功");
    } catch (e) { toast(e.message, 4000); }
  });

  // 书架筛选与搜索
  $$(".seg-tab").forEach(btn => btn.addEventListener("click", () => {
    S.libFilter = btn.dataset.filter || "all";
    $$(".seg-tab").forEach(t => t.classList.toggle("active", t === btn));
    renderBookGrid();
  }));
  $("#book-search").addEventListener("input", ev => {
    S.libQuery = ev.target.value || "";
    renderBookGrid();
  });

  // 书库快捷按钮
  $("#btn-lib-theme").addEventListener("click", toggleDayNight);
  $("#btn-lib-settings").addEventListener("click", openSettings);

  // 阅读器顶栏
  $("#btn-back").addEventListener("click", closeBook);
  $("#btn-theme").addEventListener("click", toggleDayNight);
  $("#btn-font-minus").addEventListener("click", () => nudgeFont(-1));
  $("#btn-font-plus").addEventListener("click", () => nudgeFont(1));
  $("#btn-smart").addEventListener("click", async () => {
    S.settings.smart_mode = !S.settings.smart_mode;
    refreshSmartView();
    try { await api("/api/settings", { smart_mode: S.settings.smart_mode }, "PUT"); }
    catch (e) { /* 本地状态已生效 */ }
    toast(S.settings.smart_mode
      ? "智能模式已开启：生词下划线、长难句检测"
      : "已切换回全手动模式", 2600);
  });
  $("#btn-hard-quick").addEventListener("click", () => openDrawer("hard"));
  $("#btn-vocab").addEventListener("click", () => openDrawer("vocab"));
  $("#btn-settings").addEventListener("click", openSettings);

  // 纸色弹出层
  $("#btn-paper-menu").addEventListener("click", ev => {
    ev.stopPropagation();
    const p = $("#paper-popover");
    const open = p.classList.toggle("hidden") === false;
    $("#btn-paper-menu").setAttribute("aria-expanded", String(open));
  });
  $$(".paper-opt").forEach(opt => opt.addEventListener("click", () => {
    applyTheme(opt.dataset.themeOpt);
    closePaperPopover();
  }));

  // 侧栏抽屉
  $("#btn-drawer-close").addEventListener("click", closeDrawer);
  $("#drawer-backdrop").addEventListener("click", closeDrawer);
  $$(".drawer-tab").forEach(b => b.addEventListener("click", () => switchDrawerTab(b.dataset.tab)));
  $("#vocab-search").addEventListener("input", renderVocab);
  $("#btn-export").addEventListener("click", () => { window.location.href = "/api/vocab/export.csv"; });

  // 翻页与缩放
  $("#btn-prev").addEventListener("click", pagePrev);
  $("#btn-next").addEventListener("click", pageNext);
  $("#btn-pdf-edge-prev").addEventListener("click", pagePrev);
  $("#btn-pdf-edge-next").addEventListener("click", pageNext);
  $("#page-jump").addEventListener("change", async ev => {
    const n = parseInt(ev.target.value, 10);
    if (n && S.payload) {
      window.scrollTo(0, 0);
      await loadPage(Math.min(Math.max(1, n), S.payload.total));
      refreshSmartView();
    }
  });
  $("#btn-zoom-out").addEventListener("click", () => applyPdfZoom(S.pdfZoom - 0.1));
  $("#btn-zoom-in").addEventListener("click", () => applyPdfZoom(S.pdfZoom + 0.1));
  $("#pdf-zoom-val").addEventListener("click", () => applyPdfZoom(1));

  $("#btn-chunk-prev").addEventListener("click", () => {
    if (S.chunkIdx > 0) loadChunk(S.chunkIdx - 1, false);
  });
  $("#btn-chunk-next").addEventListener("click", () => {
    if (S.chunkIdx + 1 < S.chunksTotal) loadChunk(S.chunkIdx + 1, false);
  });

  // 设置弹窗
  $("#settings-overlay").addEventListener("click", ev => {
    if (ev.target.id === "settings-overlay") $("#settings-overlay").classList.add("hidden");
  });
  $("#btn-settings-close").addEventListener("click", () => $("#settings-overlay").classList.add("hidden"));
  $("#btn-settings-cancel").addEventListener("click", () => $("#settings-overlay").classList.add("hidden"));
  $("#btn-settings-save").addEventListener("click", saveSettings);
  $("#set-zipf").addEventListener("input", updateZipfLabel);
  $("#set-smart").addEventListener("change", syncSubRows);
  $$(".theme-card").forEach(c => c.addEventListener("click", () => applyTheme(c.dataset.themeCard)));

  // 弹卡交互
  $("#popup").addEventListener("click", ev => {
    const b = ev.target.closest("button[data-act]");
    if (!b) return;
    const act = b.dataset.act;
    if (act === "close") {
      hidePopup();
    } else if (act === "tts") {
      const w = S.popCtx && (S.popCtx.entry ? S.popCtx.entry.query : S.popCtx.word);
      b.classList.add("speaking");
      setTimeout(() => b.classList.remove("speaking"), 700);
      api("/api/tts", { word: w || "" }).catch(() => {});
    } else if (act === "save") {
      const c = S.popCtx || {};
      const word = c.word || "";
      let phon = "", trans = "";
      if (c.kind === "word" && c.entry) {
        phon = c.entry.phonetic || "";
        trans = (c.entry.translation || "").split("\n").slice(0, 3).join("\n");
      } else if (c.kind === "modelword") {
        trans = c.trans || "";
      }
      if (word) saveToVocab(word.toLowerCase(), phon, trans, c.ctx || "", b);
    } else if (act === "sent") {
      if (S.popCtx && S.popCtx.ctx) showSentencePopupText(S.popCtx.ctx, S.popPos.x, S.popPos.y, "整句翻译");
    } else if (act === "modeltr") {
      if (S.popCtx && S.popCtx.word) translateViaModel(S.popCtx.word);
    } else if (act === "copy") {
      if (S.popCtx && S.popCtx.trans) copyText(S.popCtx.trans, b);
    }
  });

  // 选择浮钮
  $("#sel-fab").addEventListener("click", () => {
    const text = S.selText;
    hideFab();
    if (text) showSentencePopupText(text, S.fabX || 100, S.fabY || 100, "短语翻译");
  });

  // PDF 阅读区交互
  const pdfHost = $("#pdf-page");
  pdfHost.addEventListener("click", ev => {
    const mk = ev.target.closest(".hard-mark");
    if (mk && S.payload) {
      const s = S.payload.sents[mk.dataset.s];
      if (s) showSentencePopupText(s.text, ev.clientX, ev.clientY, "长难句翻译");
      return;
    }
    const el = ev.target.closest(".w");
    if (!el) { hidePopup(); return; }
    if (S.suppressClick) { S.suppressClick = false; return; }
    clearTimeout(S.clickTimer);
    const word = el.dataset.t;
    S.clickTimer = setTimeout(() => showWordPopup(el, ev, word), 230);
  });
  pdfHost.addEventListener("dblclick", ev => {
    const el = ev.target.closest(".w");
    clearTimeout(S.clickTimer);
    if (!el) return;
    hidePopup();
    hideFab();
    showSentencePopupText(sentenceTextOf(el), ev.clientX, ev.clientY, "整句翻译");
  });
  pdfHost.addEventListener("mousedown", ev => {
    const el = ev.target.closest(".w");
    S.mouseDownI = el ? +el.dataset.i : null;
  });
  pdfHost.addEventListener("mouseup", ev => {
    const el = ev.target.closest(".w");
    if (!el || S.mouseDownI === null) { S.mouseDownI = null; return; }
    const a = S.mouseDownI, b = +el.dataset.i;
    S.mouseDownI = null;
    if (a === b) return;
    const [lo, hi] = a < b ? [a, b] : [b, a];
    if (hi - lo > 40) return;
    S.suppressClick = true;
    setTimeout(() => { S.suppressClick = false; }, 400);
    const words = S.payload.words.slice(lo, hi + 1).map(w => w.t);
    const text = fixJoin(words);
    S.fabX = ev.clientX; S.fabY = ev.clientY;
    showSelectionFab(ev.clientX, ev.clientY, text);
  });

  // TXT 阅读区交互
  const art = $("#text-article");
  art.addEventListener("click", ev => {
    const el = ev.target.closest(".w");
    if (!el) { hidePopup(); return; }
    if (S.suppressClick) { S.suppressClick = false; return; }
    clearTimeout(S.clickTimer);
    const word = el.dataset.t;
    S.clickTimer = setTimeout(() => showWordPopup(el, ev, word), 230);
  });
  art.addEventListener("dblclick", ev => {
    const el = ev.target.closest(".w");
    clearTimeout(S.clickTimer);
    if (!el) return;
    hidePopup();
    hideFab();
    try { const s = window.getSelection(); if (s) s.removeAllRanges(); } catch (e) { /* ignore */ }
    showSentencePopupText(sentenceTextOf(el), ev.clientX, ev.clientY, "整句翻译");
  });
  art.addEventListener("mouseup", ev => {
    if (ev.detail >= 2) { hideFab(); return; }
    const sel = window.getSelection();
    const txt = sel ? sel.toString().trim() : "";
    if (txt && txt.length > 1 && txt.length < 500 &&
        (art.contains(sel.anchorNode) || art.contains(sel.focusNode))) {
      S.suppressClick = true;
      setTimeout(() => { S.suppressClick = false; }, 400);
      S.fabX = ev.clientX; S.fabY = ev.clientY;
      showSelectionFab(ev.clientX, ev.clientY, txt.replace(/\s+/g, " "));
    }
  });

  // 点击空白处收起弹层
  document.addEventListener("mousedown", ev => {
    const t = ev.target;
    if (!t.closest(".popover-anchor")) closePaperPopover();
    if (t.closest("#popup") || t.closest("#sel-fab") ||
        t.closest(".w") || t.closest(".hard-mark") || t.closest("#drawer")) return;
    hidePopup();
    hideFab();
  });

  // 键盘翻页与 Esc 关闭
  document.addEventListener("keydown", ev => {
    if (ev.key === "Escape") {
      if (!$("#settings-overlay").classList.contains("hidden")) { $("#settings-overlay").classList.add("hidden"); return; }
      if (!$("#paper-popover").classList.contains("hidden")) { closePaperPopover(); return; }
      if (!$("#popup").classList.contains("hidden")) { hidePopup(); return; }
      if (!$("#sel-fab").classList.contains("hidden")) { hideFab(); return; }
      if (!$("#drawer").classList.contains("hidden")) { closeDrawer(); return; }
      return;
    }
    if (ev.target.tagName === "INPUT" || ev.target.tagName === "TEXTAREA") return;
    if (!S.book || S.book.kind !== "pdf") return;
    if (ev.key === "ArrowRight" || ev.key === "PageDown") { ev.preventDefault(); pageNext(); }
    if (ev.key === "ArrowLeft" || ev.key === "PageUp") { ev.preventDefault(); pagePrev(); }
  });
}

/* ---------------- 进度 ---------------- */

function saveProgressDebounced() {
  if (!S.book) return;
  clearTimeout(S.progTimer);
  S.progTimer = setTimeout(async () => {
    const loc = S.book.kind === "pdf" ? { page: S.page } : { chunk: S.chunkIdx };
    try { await api("/api/progress", { book_id: S.book.id, loc }); } catch (e) { /* 忽略 */ }
  }, 700);
}

boot();
