# 三國人物誌

純 HTML / CSS / 原生 JavaScript + JSON 的三國人物資料庫。沒有用任何框架
（React / Vue / Tailwind / Bootstrap），也沒有後端或資料庫，資料全部存在
JSON 檔案裡，透過 `fetch()` 讀取。

第一版以**趙雲**作為完整示範人物，重點是把架構、版面、資料讀取方式建好，
方便之後持續新增人物。

## 檔案結構

```
tw3k/
├── index.html              首頁（人物卡片牆 + 搜尋 + 勢力篩選）
├── character.html          人物詳細頁「模板」，所有人物共用同一份，
│                            靠網址 ?id=xxx 決定要顯示誰
├── css/
│   └── style.css            所有樣式
├── js/
│   ├── common.js             共用工具（來源標籤渲染、頭像失敗替代圖等）
│   ├── main.js                首頁邏輯
│   └── character.js           詳細頁邏輯
├── data/
│   ├── index.json             ⭐ 首頁用的「輕量索引」，只有卡片牆需要的欄位
│   └── characters/
│       └── zhao-yun.json      ⭐ 趙雲的完整資料（總覽/史實/演義/著作全部在這）
└── images/
    ├── zhao-yun.svg            示範頭像（佔位圖，之後可換成正式頭像）
    └── _placeholder.svg        親屬沒有頭像、或圖片載入失敗時的替代圖
```

**為什麼資料要拆成 `data/index.json` 和 `data/characters/*.json` 兩層？**
因為首頁卡片牆只需要頭像跟姓名，不需要載入每個人完整的生平/評價/來源資料。
如果全部塞在同一個 JSON，之後人物一多，首頁會連帶載入所有人的完整內容，
既浪費流量也拖慢速度。拆開之後：

- 首頁只 fetch 一次 `data/index.json`（很小），列出所有人物卡片
- 只有點進某個人的詳細頁時，才會 fetch 那一位的 `data/characters/{id}.json`
- 新增人物時，只要新增一個 JSON 檔＋在 index.json 補一行，其他人的資料完全不用動

## 怎麼用 Live Server 開啟

這個網站的資料是用 `fetch()` 讀取本機 JSON 檔，瀏覽器基於安全性限制，
用 `file://` 直接雙擊開啟 HTML 的話 fetch 會被擋下來（CORS 錯誤），
**所以這次一定要透過本機伺服器打開**，步驟：

1. VS Code 安裝 `Live Server` 擴充套件（作者 Ritwick Dey）
2. 在檔案總管點開 `index.html`
3. 在編輯區或檔案總管的 `index.html` 上按右鍵 → **Open with Live Server**
4. 瀏覽器會自動開啟類似 `http://127.0.0.1:5500/index.html` 的網址，
   之後修改任何檔案存檔，頁面也會自動重新整理

## 如何新增下一位人物

**完全不需要新增或修改任何 HTML 檔案**，只要兩步：

### 1. 新增這位人物的完整資料檔

在 `data/characters/` 底下新增一個 JSON 檔，檔名用該人物的 id，例如
`liu-bei.json`。內容格式可以直接複製 `data/characters/zhao-yun.json`
照著改，主要區塊：

- 頁首欄位：`name` / `courtesyName` / `childhoodName` / `artName` /
  `otherNames` / `lifespan` / `birthplace` / `primaryIdentity` / `summary`
  / `avatar` —— **沒有資料的欄位可以直接刪掉那一行，或設成 `null`**，
  頁面會自動不顯示該欄位，不會出現空白或「無」
- `overview.intro`：人物簡介（附 `introSource`）
- `overview.factionTimeline`：所屬勢力歷程陣列，依時間順序，每個階段是
  一個物件（`personName` / `personId` / `avatar` / `factionName` /
  `period` / `description` / `source`）。
  **`personId` 如果對應到 `data/characters/` 裡已經存在的另一個人物 id，
  該階段就會自動變成可點擊連結並帶出頭像；還沒建檔的話 `personId` 留
  `null` 即可，會正常顯示文字，不會產生無效連結。**
- `overview.relatives`：親屬表格資料，每筆含 `personName` / `personId` /
  `avatar` / `relation`（關係）/ `natureType`（例如「史籍記載」或
  「後世文學虛構」）/ `note`（補充）/ `source`
- `overview.titlesAndRanks`：官職與爵位陣列
- `overview.posthumousTitle`：諡號（沒有就整段刪掉或留 `null`）
- `overview.contemporaryEvaluations` / `overview.laterEvaluations`：
  當世評價／後世評價，都是 `{ text, source }` 的陣列
- `historicalBio`：史實生平時間線，每筆含 `period`（年份文字，可以是
  明確年份、「約...」、「...間」或「年份不詳」）、`periodType`
  （`exact` / `approx` / `range` / `unknown`，只影響顯示樣式）、
  `title`、`content`、`source`。**`source.kind` 請務必如實填寫**
  （例如「三國志正文」「裴松之注引」「其他史籍」「地方志」「編年史」
  「現代研究」），不要籠統寫成「三國志記載」
- `romanceBio`：演義生平時間線，每筆含 `chapter`（回目）、`eventName`、
  `story`、`source`、可選的 `historicalDifference`（史實差異，會獨立
  用醒目的區塊顯示，不會跟故事內文混在一起）
- `works`：著作陣列，**沒有著作的人物直接寫 `"works": []` 就好**，
  著作頁籤會自動整個隱藏。每筆著作可含 `title` / `type` / `extant`
  （是否存世）/ `attribution`（歸屬狀態，例如「確認為本人作品」
  「傳世輯佚」「歸屬存疑」「後世托名」）/ `summary` / `anthology`
  （收錄文獻）/ `excerpt`（可選的文本內容）/ `source`

### 2. 到 `data/index.json` 補一行索引

```json
{
  "id": "liu-bei",
  "name": "劉備",
  "courtesyName": "玄德",
  "searchTerms": ["劉備", "玄德"],
  "avatar": "images/liu-bei.svg",
  "factionGroups": ["shu"]
}
```

- `id` 要跟步驟 1 的 JSON 檔名一致
- `factionGroups` 目前分四類：`shu`（蜀漢）／`wei`（曹魏）／`wu`（東吳）／
  `qunxiong`（群雄），一個人可以同時屬於多個分類（例如趙雲同時是
  `["qunxiong", "shu"]`，因為他早年也待過公孫瓚陣營）
- `searchTerms` 放所有你希望能被搜尋到的名稱、字號、拼音等，姓名和字
  本身不用重複放（程式會自動一起比對）

存檔後重新整理首頁，新人物就會出現在卡片牆裡；如果之前有其他人物的
`factionTimeline` 或 `relatives` 裡有埋 `personId` 對應到這位新人物，
那些地方也會自動從純文字變成可點擊連結，不用回頭改任何舊資料。

## 目前完成狀況（依需求逐項核對）

- [x] 首頁卡片只顯示頭像＋姓名，姓名搜尋（含字號/其他名稱）、勢力篩選、
      清除篩選、結果數量、無結果提示畫面都有
- [x] 卡片格線：桌面依寬度自動多欄，手機固定兩欄
- [x] 詳細頁共用同一份模板（`character.html?id=xxx`），沒資料的頭部欄位
      自動隱藏
- [x] 四頁籤（總覽／史實生平／演義生平／著作），切換不重新載入頁面，
      網址保留 hash，重新整理後仍停留在同一頁籤；無著作時自動隱藏著作頁籤
- [x] 總覽：簡介、所屬勢力歷程（逐階段獨立項目，非單排箭頭）、親屬
      （桌面表格／手機卡片）、官職爵位、諡號、當世評價、後世評價
- [x] 史實生平：縱向時間線，支援明確/約/區間/不詳四種年份格式，來源
      區分三國志正文／裴松之注引／其他史籍／地方志／編年史／現代研究
- [x] 演義生平：縱向時間線改用暗紅識別色，含回目、事件名稱、白話故事、
      來源，史實差異獨立區塊顯示，不與故事混排
- [x] 著作：名稱、類型、是否存世、歸屬狀態、簡介、收錄文獻、來源、可選
      文本內容
- [x] 每個區塊（簡介／勢力經歷／親屬／官職／評價／史實事件／演義事件／
      著作）都各自標示來源，來源同時顯示性質＋書名＋可選說明
- [x] 趙雲內容明確標示「示範資料」徽章
- [x] 視覺：深墨背景＋宣紙內容卡片＋朱砂主色，無卷軸竹簡或過度雕花，
      動畫僅保留必要的 hover/焦點回饋
- [x] 鍵盤焦點樣式、圖片載入失敗替代圖、人物不存在時的錯誤頁面、
      基本無障礙標示（aria-selected / role=tab 等）皆已加入
- [x] 已用本機伺服器（模擬 Live Server 環境）驗證所有頁面與 JSON 皆可
      正常存取；搜尋／篩選／人物連結／頁籤切換邏輯皆已檢查過

## 之後可能想加的功能

- 更多人物（曹操、劉備、公孫瓚等）建檔後，趙雲的 `factionTimeline` 裡
  對應的 `personId` 就能補上，自動變成可點擊連結
- 如果人物數量變很多，`data/index.json` 手動維護會變麻煩，屆時可以考慮
  加一個小腳本自動掃描 `data/characters/` 資料夾產生索引