/**
 * common.js — 首頁與人物詳細頁共用的工具函式
 */

const PLACEHOLDER_AVATAR = "images/_placeholder.svg";

/** 避免文字被當成 HTML 解析 */
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 統一的 fetch JSON 輔助，失敗時拋出錯誤讓呼叫端處理 */
async function loadJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.json();
}

/** 產生 <img> 標籤，並內建載入失敗時自動換成替代圖 */
function avatarImgHtml(src, alt, className) {
  const safeSrc = src || PLACEHOLDER_AVATAR;
  return `<img class="${className || ""}" src="${escapeHtml(safeSrc)}" alt="${escapeHtml(
    alt
  )}" loading="lazy" onerror="this.onerror=null;this.src='${PLACEHOLDER_AVATAR}';" />`;
}

/* ============================================================
 * 來源目錄（data/sources.json）解析
 * ============================================================ */

/** 將 sources.json 陣列轉成 id -> source 的查詢表 */
function buildSourceMap(sourcesArray) {
  const map = new Map();
  (sourcesArray || []).forEach((s) => map.set(s.id, s));
  return map;
}

/**
 * 將一筆 citation（{ sourceId, locator?, note? }）解析成可顯示的來源標籤 HTML。
 * sourceId 對應不到 sources.json 時，仍會顯示 sourceId 本身並標示「來源目錄缺漏」，
 * 方便之後補資料時一眼看出遺漏，而不是靜默吞掉。
 */
function citationChipHtml(citation, sourceMap) {
  if (!citation) return "";
  const src = sourceMap.get(citation.sourceId);
  if (!src) {
    return `<span class="source-chip source-chip--missing">來源目錄缺漏：${escapeHtml(citation.sourceId || "未知")}</span>`;
  }
  const kind = `<span class="source-kind">${escapeHtml(src.kind)}</span>`;
  const locator = citation.locator ? `<span class="source-locator">${escapeHtml(citation.locator)}</span>` : "";
  const note = citation.note ? `<span class="source-note">${escapeHtml(citation.note)}</span>` : "";
  return `<span class="source-chip">${kind}<span class="source-title">${escapeHtml(src.title)}</span>${locator}${note}</span>`;
}

/** 一組 citations 陣列渲染成並排的來源標籤 */
function citationsHtml(citations, sourceMap) {
  if (!citations || !citations.length) return "";
  return `<span class="citations">${citations.map((c) => citationChipHtml(c, sourceMap)).join("")}</span>`;
}

/**
 * 渲染「白話段落 + 各自來源」+ 可選的「查看史料原文」展開區 + 可選的不確定性說明。
 * contentBlock: { paragraphs: [{text, citations}], originalTexts?: [{text, sourceId, locator}], }
 * uncertaintyNote: 字串，另外獨立傳入（因為 faction stage 用的是同層欄位，historicalBio 也是）
 */
function contentBlockHtml(contentBlock, sourceMap, uncertaintyNote) {
  if (!contentBlock || !contentBlock.paragraphs) return "";

  const paragraphs = contentBlock.paragraphs
    .map(
      (p) => `
      <p class="paraphrase-text">${escapeHtml(p.text)}</p>
      ${citationsHtml(p.citations, sourceMap)}
    `
    )
    .join("");

  const originalTexts =
    contentBlock.originalTexts && contentBlock.originalTexts.length
      ? `
      <details class="original-text-toggle">
        <summary>查看史料原文</summary>
        ${contentBlock.originalTexts
          .map((o) => {
            const src = sourceMap.get(o.sourceId);
            const kindLabel = src ? escapeHtml(src.kind) : "來源目錄缺漏";
            const titleLabel = src ? escapeHtml(src.title) : escapeHtml(o.sourceId || "未知");
            return `
              <blockquote class="original-text">${escapeHtml(o.text)}</blockquote>
              <div class="original-text-source">
                <span class="source-kind">${kindLabel}</span>
                <span class="source-title">${titleLabel}</span>
                ${o.locator ? `<span class="source-locator">${escapeHtml(o.locator)}</span>` : ""}
              </div>
            `;
          })
          .join("")}
      </details>
    `
      : "";

  const uncertainty = uncertaintyNote
    ? `<div class="uncertainty-note"><span class="uncertainty-label">年代／記載說明</span><p>${escapeHtml(
        uncertaintyNote
      )}</p></div>`
    : "";

  return `${paragraphs}${originalTexts}${uncertainty}`;
}

/** 只有 target 存在時（也就是該人物已建檔且已發布）才產生可點擊連結，否則回傳純文字 */
function personLinkOrPlain(personId, innerHtml, extraClass) {
  if (personId) {
    return `<a class="${extraClass || ""} is-link" href="character.html?id=${encodeURIComponent(personId)}">${innerHtml}</a>`;
  }
  return `<div class="${extraClass || ""}">${innerHtml}</div>`;
}