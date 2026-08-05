/**
 * character.js — 人物詳細頁邏輯
 * 所有人物共用這一個頁面模板，靠網址 ?id=xxx 決定要 fetch
 * data/characters/xxx.json 來渲染內容，並同時讀取：
 *  - data/sources.json  來源目錄（sourceId -> 性質/書名）
 *  - data/factions.json 勢力目錄（實際效力勢力 id -> 正式名稱/簡介）
 *  - data/index.json    輕量索引（用來判斷其他人物是否已建檔且已發布，
 *                        才決定要不要把親屬/勢力歷程渲染成可點擊連結）
 */

const TAB_DEFS = [
  { key: "overview", label: "總覽" },
  { key: "historical", label: "史實生平" },
  { key: "romance", label: "演義生平" },
  { key: "works", label: "著作" }, // 沒有著作資料時會在渲染階段被拿掉
];

let sourceMap = new Map();
let personIndexMap = new Map(); // id -> { id, name, avatar, published }
let actualFactionsMap = new Map(); // id -> { name, description, filterGroup }

function getIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function getTabFromHash(availableKeys) {
  const key = window.location.hash.replace("#", "");
  return availableKeys.includes(key) ? key : availableKeys[0];
}

/**
 * 只有在 personId 存在、且該人物在 data/index.json 裡「已建檔且 published: true」
 * 時，才回傳可連結的資料；否則回傳 null，呼叫端要 fallback 成純文字＋預設頭像。
 */
function resolvePerson(personId) {
  if (!personId) return null;
  const p = personIndexMap.get(personId);
  if (!p || !p.published) return null;
  return p;
}

/* ---------- 頁首（空欄位自動隱藏，不顯示空白或「無」） ---------- */

function headerFieldHtml(label, value) {
  if (!value) return "";
  return `<div class="meta-field"><span class="meta-label">${escapeHtml(label)}</span><span class="meta-value">${escapeHtml(
    value
  )}</span></div>`;
}

function renderHero(c) {
  const otherNames = (c.otherNames || []).join("、");
  const metaFields = [
    headerFieldHtml("字", c.courtesyName),
    headerFieldHtml("小字", c.childhoodName),
    headerFieldHtml("號", c.artName),
    headerFieldHtml("其他名稱", otherNames),
    headerFieldHtml("生卒年", c.lifespan),
    headerFieldHtml("籍貫", c.birthplace),
    headerFieldHtml("主要身分", c.primaryIdentity),
  ]
    .filter(Boolean)
    .join("");

  const demoBadge = c.isDemoData || c.dataStatus
    ? `<div class="demo-badge">${escapeHtml(demoBadgeLabel(c))}</div>`
    : "";

  return `
    ${demoBadge}
    <section class="char-hero">
      <span class="avatar-ring avatar-ring--lg">
        ${avatarImgHtml(c.avatar, `${c.name}的頭像`, "")}
      </span>
      <div class="char-hero-info">
        <h1 class="char-hero-name">${escapeHtml(c.name)}</h1>
        ${c.summary ? `<p class="char-summary">${escapeHtml(c.summary)}</p>` : ""}
        <div class="meta-grid">${metaFields}</div>
      </div>
    </section>
  `;
}

function demoBadgeLabel(c) {
  if (c.dataStatus === "reviewed-draft") {
    return "示範資料 — 內容已逐條核對原文，仍可能有疏漏，歡迎指正";
  }
  if (c.dataStatus) return `示範資料（狀態：${c.dataStatus}）`;
  return "示範資料 — 尚未完整核校，僅供測試版面";
}

/* ---------- 人物參照（親屬／勢力歷程共用）---------- */

/**
 * 產生人物頭像＋姓名的內容，並依是否已發布決定要不要包成連結。
 * fallbackAvatar：當 personId 沒有連結到已發布人物時使用的備用頭像路徑
 * （給還沒有自己完整頁面、但想放張圖的親屬/勢力人物用）。
 */
function resolvePersonRef(personId, fallbackName, fallbackAvatar, avatarClass) {
  const resolved = resolvePerson(personId);
  const name = resolved ? resolved.name : fallbackName;
  const avatar = resolved ? resolved.avatar : fallbackAvatar || null;
  const avatarHtml = avatarImgHtml(avatar, `${name}的頭像`, avatarClass);
  return { name, avatarHtml, linkedId: resolved ? resolved.id : null };
}

/* ---------- 總覽頁籤 ---------- */

function renderFactionTimeline(entries) {
  if (!entries || !entries.length) return "";
  const items = entries
    .map((f, i) => {
      const isContinuation = i > 0 && entries[i - 1].personName === f.personName;
      const ref = resolvePersonRef(f.personId, f.personName, f.avatar, "faction-stage-avatar");
      const actualFaction = actualFactionsMap.get(f.actualFactionId);
      const factionLabel = actualFaction ? actualFaction.name : f.stageName || "";
      const uncertainFlag = f.periodUncertain
        ? `<span class="uncertain-flag" title="年代為推定，非確定記載">年代推定</span>`
        : "";
      // 連續階段若是同一人物（例如劉備集團 → 蜀漢先主都是劉備），
      // 第二階段不重複放頭像跟姓名，只用一個空白佔位保持縮排對齊
      const avatarBlock = isContinuation
        ? `<span class="avatar-ring avatar-ring--sm avatar-ring--spacer" aria-hidden="true"></span>`
        : `<span class="avatar-ring avatar-ring--sm">${ref.avatarHtml}</span>`;
      const personLine = isContinuation ? "" : `<div class="faction-stage-person">${escapeHtml(f.personName)}</div>`;
      const inner = `
        ${avatarBlock}
        <div class="faction-stage-body">
          ${personLine}
          <div class="faction-stage-faction">${escapeHtml(factionLabel)}</div>
          <div class="faction-stage-period">${escapeHtml(f.period)}${uncertainFlag}</div>
          ${contentBlockHtml(f.description, sourceMap, f.uncertaintyNote)}
        </div>
      `;
      const extraClass = isContinuation ? "faction-stage faction-stage--continuation" : "faction-stage";
      return `<li>${personLinkOrPlain(ref.linkedId, inner, extraClass)}</li>`;
    })
    .join("");
  return `
    <div class="section-block">
      <h2 class="section-title">所屬勢力與效力歷程</h2>
      <ol class="faction-stage-list">${items}</ol>
    </div>
  `;
}

function renderTitlesAndRanks(list) {
  if (!list || !list.length) return "";
  const rows = list
    .map(
      (t) => `
      <li class="rank-item">
        <span class="rank-title">${escapeHtml(t.title)}</span>
        <span class="rank-period">${escapeHtml(t.period)}</span>
        ${citationsHtml(t.citations, sourceMap)}
      </li>`
    )
    .join("");
  return `
    <div class="section-block">
      <h2 class="section-title">官職與爵位</h2>
      <ul class="rank-list">${rows}</ul>
    </div>
  `;
}

function renderPosthumousTitle(pt) {
  if (!pt || !pt.title) return "";
  const paragraphsHtml = pt.paragraphs
    ? contentBlockHtml({ paragraphs: pt.paragraphs }, sourceMap)
    : "";
  return `
    <div class="section-block">
      <h2 class="section-title">諡號</h2>
      <div class="plain-card">
        <p><strong>${escapeHtml(pt.title)}</strong>${pt.grantedBy ? ` — ${escapeHtml(pt.grantedBy)}` : ""}</p>
        ${citationsHtml(pt.citations, sourceMap)}
        ${paragraphsHtml}
      </div>
    </div>
  `;
}

function renderRelatives(list) {
  if (!list || !list.length) return "";
  const rows = list
    .map((r) => {
      const ref = resolvePersonRef(r.personId, r.personName, r.avatar, "rel-avatar");
      const personCell = personLinkOrPlain(
        ref.linkedId,
        `${ref.avatarHtml}<span>${escapeHtml(ref.name)}</span>`,
        "rel-person-cell"
      );
      // 只要文字含「文學」或「虛構」就當非正史來源樣式，其餘（史籍記載、
      // 三國志正文記載、正文及裴注記載…等寫法皆可）都算 record，
      // 不能只完全比對「史籍記載」四個字。
      const isFictionType = /文學|虛構/.test(r.natureType || "");
      return `
        <tr>
          <td class="person-cell">${personCell}</td>
          <td data-label="關係">${escapeHtml(r.relation)}</td>
          <td data-label="資料性質"><span class="nature-badge" data-nature="${
            isFictionType ? "fiction" : "record"
          }">${escapeHtml(r.natureType)}</span></td>
          <td data-label="補充">${escapeHtml(r.note || "")}${citationsHtml(r.citations, sourceMap)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="section-block">
      <h2 class="section-title">親屬</h2>

      <div class="table-scroll">
        <table class="relative-table">
          <thead>
            <tr><th>人物</th><th>關係</th><th>資料性質</th><th>補充</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderEvaluationEntry(e) {
  const isOriginal = e.textType === "古籍原文" && e.originalText;
  const textHtml = isOriginal
    ? `<blockquote class="original-text">${escapeHtml(e.originalText)}</blockquote>`
    : `<p class="paraphrase-text">${escapeHtml(e.paraphrase || "")}</p>`;
  return `
    <div class="quote-card">
      <div class="quote-meta">
        <span class="quote-evaluator">${escapeHtml(e.evaluatorName)}</span>
        ${e.evaluatorEra ? `<span class="quote-era">${escapeHtml(e.evaluatorEra)}</span>` : ""}
      </div>
      ${e.context ? `<p class="quote-context">${escapeHtml(e.context)}</p>` : ""}
      ${textHtml}
      ${citationsHtml(e.citations, sourceMap)}
    </div>
  `;
}

function renderEvaluations(title, list) {
  if (!list || !list.length) return "";
  return `
    <div class="section-block">
      <h2 class="section-title">${escapeHtml(title)}</h2>
      ${list.map(renderEvaluationEntry).join("")}
    </div>
  `;
}

function renderOverviewTab(c) {
  const ov = c.overview || {};
  let html = "";

  if (ov.intro) {
    html += `
      <div class="section-block">
        <h2 class="section-title">人物簡介</h2>
        ${contentBlockHtml(ov.intro, sourceMap)}
      </div>
    `;
  }

  html += renderFactionTimeline(ov.factionTimeline);
  html += renderRelatives(ov.relatives);
  html += renderTitlesAndRanks(ov.titlesAndRanks);
  html += renderPosthumousTitle(ov.posthumousTitle);

  const evals = ov.evaluations || {};
  html += renderEvaluations("當世評價", evals.contemporary);
  html += renderEvaluations("後世評價", evals.later);

  return html || `<p class="paraphrase-text">尚無總覽資料。</p>`;
}

/* ---------- 史實 / 演義生平：縱向時間線 ---------- */

function historicalTimelineHtml(entries) {
  if (!entries || !entries.length) {
    return `<p class="paraphrase-text">尚無史實生平資料。</p>`;
  }
  const items = entries
    .map(
      (e) => `
      <li class="timeline-item timeline-item--historical">
        <div class="timeline-period-col" data-period-type="${e.periodType || ""}">${escapeHtml(e.period)}</div>
        <div class="timeline-track"><span class="timeline-dot"></span></div>
        <div class="timeline-content">
          <span class="timeline-period-inline">${escapeHtml(e.period)}</span>
          <h3 class="timeline-title">${escapeHtml(e.title)}</h3>
          ${contentBlockHtml(e.content, sourceMap, e.uncertaintyNote)}
        </div>
      </li>`
    )
    .join("");
  return `<ol class="timeline-list">${items}</ol>`;
}

function diffNoteHtml(contentBlock) {
  if (!contentBlock || !contentBlock.paragraphs) return "";
  return contentBlock.paragraphs.map((p) => `<p class="paraphrase-text">${escapeHtml(p.text)}</p>`).join("");
}

function romanceTimelineHtml(entries) {
  if (!entries || !entries.length) {
    return `<p class="paraphrase-text">尚無演義生平資料。</p>`;
  }
  const items = entries
    .map(
      (e) => `
      <li class="timeline-item timeline-item--romance">
        <div class="timeline-period-col">${escapeHtml(e.chapter)}</div>
        <div class="timeline-track"><span class="timeline-dot"></span></div>
        <div class="timeline-content">
          <span class="timeline-period-inline">${escapeHtml(e.chapter)}</span>
          <h3 class="timeline-title">${escapeHtml(e.eventName)}</h3>
          ${contentBlockHtml(e.content, sourceMap)}
          ${
            e.historicalDifference
              ? `<div class="diff-note"><span class="diff-label">史實差異</span>${diffNoteHtml(
                  e.historicalDifference
                )}</div>`
              : ""
          }
        </div>
      </li>`
    )
    .join("");
  return `<ol class="timeline-list">${items}</ol>`;
}

/* ---------- 著作 ---------- */

function worksTabHtml(works) {
  if (!works || !works.length) return "";
  return works
    .map((w) => {
      const meta = [w.type, w.extant, w.attribution].filter(Boolean).join(" · ");
      return `
        <div class="work-entry">
          <h3 class="work-title">${escapeHtml(w.title)}</h3>
          ${meta ? `<div class="work-meta">${escapeHtml(meta)}</div>` : ""}
          ${w.summary ? `<p class="paraphrase-text">${escapeHtml(w.summary)}</p>` : ""}
          ${w.anthology ? `<p class="work-anthology">收錄於：${escapeHtml(w.anthology)}</p>` : ""}
          ${w.excerpt ? `<blockquote class="original-text">${escapeHtml(w.excerpt)}</blockquote>` : ""}
          ${citationsHtml(w.citations, sourceMap)}
        </div>
      `;
    })
    .join("");
}

/* ---------- 頁籤切換（hash 路由 + 鍵盤方向鍵 + 瀏覽器上一頁/下一頁） ---------- */

function renderTabs(c) {
  const hasWorks = c.works && c.works.length > 0;
  const tabs = TAB_DEFS.filter((t) => t.key !== "works" || hasWorks);
  const availableKeys = tabs.map((t) => t.key);

  const panelHtml = {
    overview: renderOverviewTab(c),
    historical: historicalTimelineHtml(c.historicalBio),
    romance: romanceTimelineHtml(c.romanceBio),
    works: hasWorks ? worksTabHtml(c.works) : "",
  };

  const nav = document.getElementById("tabs-nav");
  const content = document.getElementById("tabs-content");
  let activeKey = getTabFromHash(availableKeys);

  function paint(focusTab) {
    nav.innerHTML = tabs
      .map(
        (t) => `
        <button type="button" class="tab-btn" role="tab" data-tab="${t.key}"
          aria-selected="${t.key === activeKey}" tabindex="${t.key === activeKey ? "0" : "-1"}"
          id="tab-${t.key}" aria-controls="panel-${t.key}">
          ${t.label}
        </button>`
      )
      .join("");

    content.innerHTML = tabs
      .map(
        (t) => `
        <div class="tab-panel" role="tabpanel" id="panel-${t.key}" aria-labelledby="tab-${t.key}"
          data-panel="${t.key}" ${t.key === activeKey ? "" : "hidden"}>
          ${panelHtml[t.key]}
        </div>`
      )
      .join("");

    if (focusTab) {
      const btn = nav.querySelector(`.tab-btn[data-tab="${activeKey}"]`);
      if (btn) btn.focus();
    }
  }

  function activate(key, { pushHistory, focusTab } = {}) {
    if (key === activeKey) return;
    activeKey = key;
    if (pushHistory) {
      const url = `${window.location.pathname}${window.location.search}#${activeKey}`;
      history.pushState(null, "", url);
    }
    paint(focusTab);
  }

  paint(false);

  nav.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;
    activate(btn.dataset.tab, { pushHistory: true, focusTab: false });
  });

  // 方向鍵 / Home / End：符合 WAI-ARIA tabs 模式的鍵盤導覽，移動焦點同時切換內容
  nav.addEventListener("keydown", (e) => {
    const currentIndex = availableKeys.indexOf(activeKey);
    let nextIndex = null;
    if (e.key === "ArrowRight") nextIndex = (currentIndex + 1) % availableKeys.length;
    else if (e.key === "ArrowLeft") nextIndex = (currentIndex - 1 + availableKeys.length) % availableKeys.length;
    else if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = availableKeys.length - 1;
    else return;

    e.preventDefault();
    activate(availableKeys[nextIndex], { pushHistory: true, focusTab: true });
  });

  // 瀏覽器上一頁／下一頁：hashchange 會在按上一頁/下一頁時觸發，重新對齊畫面
  window.addEventListener("hashchange", () => {
    const key = getTabFromHash(availableKeys);
    if (key !== activeKey) {
      activeKey = key;
      paint(false);
    }
  });
}

/* ---------- 錯誤頁面 ---------- */

function renderNotFound(id) {
  document.getElementById("char-root").innerHTML = `
    <div class="not-found">
      <h1>找不到這位人物</h1>
      <p>網址中的 id「${escapeHtml(id || "")}」目前沒有對應的人物資料，可能是網址錯誤，或這位人物尚未建檔。</p>
      <a class="back-link" href="index.html">← 返回人物列表</a>
    </div>
  `;
  document.title = "找不到人物 - 三國人物誌";
}

/* ---------- 初始化 ---------- */

async function init() {
  const id = getIdFromUrl();
  if (!id) {
    renderNotFound(id);
    return;
  }

  let character, sources, factions, people;
  try {
    [character, sources, factions, people] = await Promise.all([
      loadJson(`data/characters/${encodeURIComponent(id)}.json`),
      loadJson("data/sources.json"),
      loadJson("data/factions.json"),
      loadJson("data/index.json"),
    ]);
  } catch (err) {
    console.error(`載入人物頁所需資料失敗（id=${id}）：`, err);
    renderNotFound(id);
    return;
  }

  sourceMap = buildSourceMap(sources);
  (factions.actualFactions || []).forEach((f) => actualFactionsMap.set(f.id, f));
  people.forEach((p) => personIndexMap.set(p.id, p));

  document.title = `${character.name} - 三國人物誌`;

  const root = document.getElementById("char-root");
  root.innerHTML = `
    ${renderHero(character)}
    <nav class="tabs-nav" id="tabs-nav" role="tablist"></nav>
    <div id="tabs-content"></div>
  `;

  renderTabs(character);
}

init();