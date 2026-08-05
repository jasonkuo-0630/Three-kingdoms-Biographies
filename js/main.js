/**
 * main.js — 首頁邏輯
 * 讀取 data/index.json（輕量索引）+ data/factions.json（篩選分類目錄）。
 * 篩選分類不再寫死在這支檔案裡，之後要增加「東漢」「西晉」等分類，
 * 只要改 data/factions.json 就好。
 */

const state = {
  query: "",
  group: "all",
  people: [],
  filterGroups: [], // 從 factions.json 讀到的 { id, label, order } 陣列
};

function initFactionPills() {
  const container = document.getElementById("faction-pills");
  // 只顯示「目前人物資料裡實際用到」的分類（加上「全部」），
  // 避免一開始就列出一堆還沒有任何人物的空分類
  const groupsInUse = new Set();
  state.people.forEach((p) => (p.filterGroups || []).forEach((g) => groupsInUse.add(g)));

  const options = [{ id: "all", label: "全部" }, ...state.filterGroups.filter((g) => groupsInUse.has(g.id))];

  container.innerHTML = options
    .map((g) => {
      const pressed = g.id === state.group ? "true" : "false";
      return `<button type="button" class="pill" data-group="${g.id}" aria-pressed="${pressed}">${escapeHtml(
        g.label
      )}</button>`;
    })
    .join("");

  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".pill");
    if (!btn) return;
    state.group = btn.dataset.group;
    syncPillButtons();
    renderCards();
  });
}

function syncPillButtons() {
  document
    .querySelectorAll(".pill")
    .forEach((p) => p.setAttribute("aria-pressed", p.dataset.group === state.group ? "true" : "false"));
}

function initSearch() {
  const input = document.getElementById("search-input");
  input.addEventListener("input", () => {
    state.query = input.value.trim();
    renderCards();
  });

  document.getElementById("clear-btn").addEventListener("click", () => {
    state.query = "";
    state.group = "all";
    input.value = "";
    syncPillButtons();
    renderCards();
  });
}

function getFilteredPeople() {
  const q = state.query.toLowerCase();
  return state.people.filter((p) => {
    if (!p.published) return false;
    const matchesGroup = state.group === "all" || (p.filterGroups || []).includes(state.group);
    if (!matchesGroup) return false;
    if (!q) return true;
    const terms = [p.name, p.courtesyName, ...(p.searchTerms || [])].filter(Boolean);
    return terms.some((t) => t.toLowerCase().includes(q));
  });
}

function cardTemplate(p) {
  return `
    <a class="char-card" href="character.html?id=${encodeURIComponent(p.id)}" aria-label="查看${escapeHtml(p.name)}的介紹">
      <span class="avatar-ring">
        ${avatarImgHtml(p.avatar, `${p.name}的頭像`, "")}
      </span>
      <span class="char-name">${escapeHtml(p.name)}</span>
    </a>
  `;
}

function renderCards() {
  const grid = document.getElementById("card-grid");
  const emptyState = document.getElementById("empty-state");
  const resultCount = document.getElementById("result-count");
  const filtered = getFilteredPeople();

  grid.innerHTML = filtered.map(cardTemplate).join("");
  emptyState.hidden = filtered.length > 0;
  grid.hidden = filtered.length === 0;
  resultCount.textContent = `共 ${filtered.length} 位人物`;
}

async function init() {
  try {
    const [people, factions] = await Promise.all([loadJson("data/index.json"), loadJson("data/factions.json")]);
    state.people = people;
    state.filterGroups = (factions.filterGroups || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (err) {
    document.getElementById("card-grid").innerHTML = "";
    document.getElementById("result-count").textContent = "";
    document.getElementById("empty-state").hidden = false;
    document.getElementById("empty-state").textContent =
      "人物索引載入失敗，請確認是否透過 Live Server（本機伺服器）開啟本網站。";
    console.error("首頁資料載入失敗：", err);
    return;
  }

  initFactionPills();
  initSearch();
  renderCards();
}

init();