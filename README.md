# 三國人物誌

純 HTML / CSS / 原生 JavaScript + JSON 的三國人物資料庫，沒有用任何框架，
沒有後端或資料庫。第一版以**趙雲**作為完整示範人物。

這一版是在第一版架構上做的內容與資料結構升級，**視覺風格與版面沒有改動**，
主要調整：白話與史料原文分離、勢力歷程改成四階段獨立敘述、來源與勢力共用
目錄、人物連結改成真的檢查對方是否已建檔發布、頁籤補上鍵盤導覽。

## 檔案結構

```
tw3k/
├── index.html              首頁（人物卡片牆 + 搜尋 + 勢力篩選）
├── character.html          人物詳細頁「模板」，所有人物共用同一份
├── css/
│   └── style.css            所有樣式（視覺風格未變動）
├── js/
│   ├── common.js             共用工具：來源目錄解析、段落+引文渲染、
│   │                         可展開史料原文區塊、頭像失敗替代圖
│   ├── main.js                 首頁邏輯
│   └── character.js            詳細頁邏輯
├── data/
│   ├── index.json              首頁用的輕量索引（含 published 欄位）
│   ├── sources.json            ⭐ 共用來源目錄
│   ├── factions.json           ⭐ 共用勢力目錄（篩選分類／實際效力勢力）
│   └── characters/
│       └── zhao-yun.json       趙雲的完整資料
└── images/
    ├── zhao-yun.svg             示範頭像（佔位圖）
    └── _placeholder.svg         沒有頭像／圖片載入失敗時的替代圖
```

## 這次新增的三個共用資料檔

### `data/sources.json` — 來源目錄

之前每個人物 JSON 都要重複手寫「《三國志》正文」「裴松之注引」這些字樣，
之後人物一多容易各寫各的、名稱不統一。現在改成集中管理：

```json
{
  "id": "yun-biezhuan",
  "kind": "裴松之注引",
  "title": "《雲別傳》",
  "note": "裴松之注《三國志‧趙雲傳》所引，原書已佚……"
}
```

人物 JSON 裡不再直接寫來源全名，而是引用 `sourceId`：

```json
"citations": [{ "sourceId": "yun-biezhuan", "locator": "選填，卷次/回目", "note": "選填補充" }]
```

`kind` 目前用到的分類：三國志正文、裴松之注引、其他史籍、演義原文、
後世文學、現代研究（地方志、編年史尚未用到，但欄位已支援，之後新增人物
若用到直接加進 `sources.json` 即可）。

**如果 `sourceId` 打錯字、或忘記先在 `sources.json` 登記**，畫面上會直接
顯示「來源目錄缺漏：xxx」的警示標籤，而不是靜默吞掉，方便你一眼發現漏填。

### `data/factions.json` — 勢力目錄

明確拆成兩層，不要混用：

- `filterGroups`：首頁篩選用的粗分類——東漢／群雄／曹魏／蜀漢／孫吳／西晉
- `actualFactions`：人物實際效力過的具體勢力——例如「公孫瓚部」「劉備集團
  （蜀漢建立前）」「蜀漢・先主政權」「蜀漢・後主政權」，每個都掛一個
  `filterGroup` 表示它歸在哪個粗分類底下

首頁的勢力篩選按鈕現在是讀這個檔案動態產生，不再寫死在 `main.js` 裡；
之後要新增「東漢」分類底下的人物，直接在 `factionTimeline` 裡引用
`actualFactionId`，不用改任何前端程式碼。

**首頁篩選只採「最後效忠的陣營」，不是複數勢力**：`data/index.json`
裡每位人物只填一個 `filterGroup`（單一字串，不是陣列），代表他們一生
最終效忠的陣營——例如趙雲雖然早年待過公孫瓚，但最終效忠蜀漢，首頁篩選
只會歸在「蜀漢」；劉備一生輾轉過七、八個勢力，首頁篩選也只歸在他最終
建立的「蜀漢」。人物完整的效力歷程（包含早年待過哪些勢力）還是完整
記錄在該人物 JSON 的 `overview.factionTimeline` 裡，只是首頁篩選這一層
刻意簡化成單一分類，避免使用者篩選「群雄」卻同時看到趙雲、劉備這種
其實早就已經是蜀漢陣營的人物，造成篩選結果混亂。

### 人物 JSON 裡的 `ContentBlock` 結構

這是這次最大的結構調整。之前 `historicalBio.content`、`overview.intro`
都只有單一字串＋單一來源，現在改成「白話為主、原文為輔」的結構，各處
（人物簡介、勢力經歷、史實事件、演義事件）共用同一套格式：

```json
{
  "paragraphs": [
    { "text": "白話敘述，不加引號。", "citations": [{ "sourceId": "sgz-zhaoyun-main" }] }
  ],
  "originalTexts": [
    { "text": "逐字核對過的史料原文。", "sourceId": "sgz-zhaoyun-main", "locator": "卷三十六" }
  ]
}
```

- `paragraphs`：白話整理內容，可以有多段，**每段各自掛自己的來源**，
  畫面上不會加引號，避免看起來像是逐字引用
- `originalTexts`：可選。有的話畫面上會出現「查看史料原文」的展開區，
  點開才顯示，原文一律用 `blockquote` 樣式跟白話內容明確區隔
- **若沒有核對到可靠原文，`originalTexts` 就整個不要寫**，不要自己生成
  一段看起來像原文的內容
- 另外還有一個平行欄位 `uncertaintyNote`（跟 `paragraphs`/`originalTexts`
  同一層），用來說明年代推定、不同記載或可信度問題，畫面上會用獨立的
  虛線框顯示，不會跟正文敘述混在一起

## 頁首與人物簡介的準確度修正

這次也把趙雲的頁首欄位跟簡介內容重新核對過（實際搜尋、比對維基文庫版
《三國志》卷三十六原文與裴注），主要修正：

- `primaryIdentity`／`summary` 改為更精確的官職沿革敘述，拿掉「開國元勳」
  「託孤」「自始至終未曾更易陣營」這類不準確或過度概括的說法
- 人物簡介拆成兩段白話敘述，各自附上對應來源
- 官職與爵位補上先前遺漏的「鎮東將軍」，並逐項核對是出自《三國志》正文
  還是裴松之注引《雲別傳》
- 趙統、趙廣的記載改標為《三國志》正文（原本誤標成《雲別傳》），趙統的
  官職改回原文用詞「虎賁中郎督，行領軍」
- 馬雲祿改回原作名稱「馬雲騄」，關係改標「後世小說設定中的妻子」，來源
  改標「後世文學」並指向《反三國演義》（周大荒著，又名《反三國志》）
- 移除了原本來源不明、疑似拼接的評語「雲昔從先主，周旋歷險，武力既弘，
  加以忠雅」，改收錄可核對出處的當世／後世評價（詳見下方）
- 所屬勢力歷程改成四個獨立階段（公孫瓚部／劉備集團／蜀漢先主政權／
  蜀漢後主政權），劉備到劉禪標成同一政治集團的君主更替，而不是趙雲
  「改投」了另一個勢力；184年這種缺乏直接依據的年份已拿掉，改用
  「初平年間（約191年前後，年代為推定）」並附上 `uncertaintyNote` 說明

演義生平也做了兩處修正：長坂坡事件不再直接寫成小說明文記載「七進七出」，
改成「小說安排他多次往返衝突……後世常概括為七進七出」；截江奪阿斗補上
史實差異說明，指出《雲別傳》裴注也記載了此事，《三國演義》是在此基礎上
加入更多戲劇化情節。

## 評價資料結構

`overview.evaluations` 現在分成 `contemporary`（當世評價）與 `later`
（後世評價）兩組，每筆至少支援：

```json
{
  "evaluatorName": "劉備",
  "evaluatorEra": "蜀漢先主",
  "context": "建安二十四年漢水之戰後，劉備親至趙雲營地視察戰況所言",
  "textType": "古籍原文",
  "originalText": "子龍一身都是膽也。",
  "citations": [{ "sourceId": "yun-biezhuan" }]
}
```

`textType` 是 `"古籍原文"` 時畫面用 `blockquote` 呈現 `originalText`；
若是白話轉述，改填 `paraphrase` 欄位（不加引號）。目前收錄的評價都已
核對過具體出處：劉備「子龍一身都是膽也」、劉禪追諡詔書、姜維等人議諡的
奏議（三則皆出自裴松之注引《雲別傳》）、楊戲《季漢輔臣贊》（**明確標註
這是趙雲與陳到的合贊，不是只評價趙雲一人**），以及陳壽《三國志》卷末
對關羽、張飛、馬超、黃忠、趙雲五人的合評（標明這是西晉史家的史筆評語，
不是趙雲在世時的評價）。

## 人物連結：現在真的會檢查對方是否已建檔發布

之前的 `personLinkOrPlain()` 只要拿到 `personId` 就會產生連結，並沒有
真的確認那個人物存不存在。現在 `character.js` 會先讀取 `data/index.json`
建立一份人物對照表，親屬與勢力歷程裡要不要顯示成連結，改用這個邏輯：

- 只有 `personId` 對應到索引裡「存在且 `published: true`」的人物，才會
  顯示成可點擊連結，頭像與姓名也直接從索引取得
- 尚未發布或根本不存在的人物，維持純文字＋灰色預設頭像，不會產生失效連結
- 人物 JSON 裡的親屬／勢力歷程只要填 `personName`（顯示用文字）跟可選的
  `personId`（要連結誰），**不需要重複手動填該人物的頭像路徑**——有連結
  上就自動從索引帶頭像，路徑之後那個人物換頭像也不用回頭改這邊

趙雲目前是唯一建檔的人物，所以 `factionTimeline` 裡的公孫瓚、劉備、劉禪
`personId` 都先留 `null`，畫面上會正常顯示文字、不產生連結；之後真的
建了他們的頁面、在 `data/index.json` 標上 `published: true`，回來這裡把
`personId` 填上去就會自動變成連結，不用改其他任何地方。

## 頁籤：鍵盤導覽 + 瀏覽器上一頁／下一頁

- 方向鍵 ← → 在頁籤按鈕之間移動並直接切換內容，`Home`／`End` 跳到第一個
  ／最後一個頁籤，符合 WAI-ARIA tabs 的鍵盤操作慣例（roving tabindex：
  目前選中的頁籤 `tabindex="0"`，其餘 `tabindex="-1"`）
- 點擊頁籤或用鍵盤切換，都會用 `history.pushState()` 把新的 hash 推進
  瀏覽器歷史紀錄，所以瀏覽器的上一頁／下一頁按鈕真的可以在你切換過的
  頁籤之間來回，不是只有重新整理才會保留 hash

## 怎麼用 Live Server 開啟

資料是用 `fetch()` 讀取本機 JSON，一定要透過本機伺服器打開，不能直接
雙擊 `index.html`（會被瀏覽器的 CORS 限制擋下來）：

1. VS Code 安裝 `Live Server` 擴充套件（作者 Ritwick Dey）
2. 在檔案總管點開 `index.html`
3. 在編輯區或檔案總管的 `index.html` 上按右鍵 → **Open with Live Server**
4. 瀏覽器會自動開啟類似 `http://127.0.0.1:5500/index.html` 的網址，之後
   修改檔案存檔，頁面也會自動重新整理

## 如何新增下一位人物

還是完全不用碰任何 HTML。步驟：

### 1. 確認 `data/sources.json` 涵蓋這個人會用到的來源

新人物如果會引用到還沒登記過的書目（例如《華陽國志》《資治通鑑》），
先在 `sources.json` 補一筆 `{ id, kind, title, note }`，之後這個人物的
`citations` 就能直接引用這個 `sourceId`。

### 2. 確認 `data/factions.json` 涵蓋這個人實際待過的勢力

如果他效力過的具體勢力（例如「曹操勢力」「東吳・孫權政權」）還沒登記，
先在 `actualFactions` 裡補一筆，並指定它屬於哪個 `filterGroup`。

### 3. 新增這位人物的完整資料檔

在 `data/characters/` 底下新增 `{id}.json`，可以複製
`data/characters/zhao-yun.json` 照著改。主要區塊（欄位說明見上方各節）：

- 頁首欄位：`name` / `courtesyName` / `childhoodName` / `artName` /
  `otherNames` / `lifespan` / `birthplace` / `primaryIdentity` /
  `summary` / `avatar`，沒資料的欄位可以直接刪掉那一行或設成 `null`，
  頁面會自動不顯示
- `schemaVersion`（目前為 `2`）／`dataStatus`（例如 `"reviewed-draft"`
  或之後資料更完整時的其他狀態字串）／`published`（`true` 才會被其他
  人物的連結邏輯認可）／`lastReviewedAt`（最後核對日期，方便之後排查
  哪些資料该重新檢查）
- `overview.intro`：`ContentBlock` 結構的人物簡介
- `overview.factionTimeline`：勢力歷程陣列，每個階段是
  `{ stageName, personName, personId, actualFactionId, period,
  periodUncertain, description(ContentBlock), uncertaintyNote }`
- `overview.relatives`：每筆 `{ personName, personId, relation,
  natureType, note, citations }`
- `overview.titlesAndRanks`：每筆 `{ title, period, citations }`
- `overview.posthumousTitle`：`{ title, grantedBy, citations,
  paragraphs }`（沒有諡號就整段刪掉或留 `null`）
- `overview.evaluations`：`{ contemporary: [...], later: [...] }`，
  每筆評價格式見上方「評價資料結構」一節
- `historicalBio` / `romanceBio`：事件陣列，`content` 都是
  `ContentBlock`；`romanceBio` 每筆另有可選的 `historicalDifference`
  （同樣是 `ContentBlock`，畫面上會獨立顯示，不會跟故事混排）
- `works`：沒有著作直接寫 `"works": []`，著作頁籤會自動整個隱藏。每篇著作
  除了 `title`/`type`/`extant`/`attribution`/`summary`/`anthology`/`excerpt`/
  `citations` 之外，還有一個可選欄位 `fullText`（字串陣列，一段一個元素），
  有填的話畫面上會出現可展開的「查看全文」區塊。**要不要放全文，照這個
  原則判斷**：
  - **值得放全文**：篇幅不長（大概數百字內）、確實完整流傳下來、且是公有
    領域的文言文（三國時代作品早已沒有著作權疑慮）——例如〈出師表〉
    〈誡子書〉〈誡外甥書〉這類。只放一句摘錄反而顯得單薄，讀者會想看
    完整內容。
  - **不適合放全文**：只存殘句的（`excerpt` 摘錄的就已經是現存的全部
    文字，沒有更多可放）；或內容已經在別的地方（例如史實生平的原文
    區塊）完整出現過，這裡重複貼一次沒有意義（例如隆中對，它是傳記裡
    一段對話記錄，不是獨立成篇的文書）；或原書已佚、只剩篇目/目錄的
    （例如《諸葛氏集》）。
  - **可以放但要註明爭議**：全文確實有保留下來，但作者真偽本身有爭議
    （例如〈後出師表〉），可以放全文，但 `attribution` 欄位要持續掛著
    那個警語，不能因為放了全文就讓人誤以為歸屬沒有疑問。
  - 全文一律只能是**查證過的逐字稿**，查不到可靠版本就不要放；不同版本
    間如果有異文（例如「臨表涕泣」還是「臨表涕零」），要註明版本差異，
    不要自己選一個蓋過去。

### 4. 到 `data/index.json` 補一行索引

```json
{
  "id": "liu-bei",
  "published": true,
  "name": "劉備",
  "courtesyName": "玄德",
  "searchTerms": ["劉備", "玄德"],
  "avatar": "images/liu-bei.svg",
  "filterGroup": "shu"
}
```

`published` 先設 `false` 也可以（例如資料還沒核對完、只是先佔位），
這樣其他人物的 `personId` 就算填了也不會顯示成連結，等確認內容沒問題
再改成 `true`。存檔重新整理後，新人物會出現在卡片牆裡；如果趙雲的
`factionTimeline` 或 `relatives` 裡有埋對應的 `personId`，也會自動從
純文字變成可點擊連結，不用回頭改趙雲的資料。

## 目前完成狀況（依這次需求逐項核對）

- [x] 首頁卡片固定依姓名筆畫排序（`Intl.Collator("zh-Hant-u-co-stroke")`）
- [x] 首頁篩選改採單一「最後效忠陣營」（`filterGroup`），不再是複數陣營
      （`filterGroups` 陣列），避免篩選結果混亂
- [x] 白話為主、原文為輔：`ContentBlock` 結構讓每段白話各自掛來源，
      原文收在可展開的「查看史料原文」區塊，一律用 `blockquote`，
      不會跟白話整理內容混排或誤用引號
- [x] 頁首與人物簡介依核對過的原文修正官職沿革、拿掉不準確的概括說法
- [x] 所屬勢力歷程改為四階段獨立敘述，年代推定明確標註、不呈現為確定
      年份；只在 `personId` 對應到已發布人物時才產生連結
- [x] 趙統、趙廣來源改回《三國志》正文；翊軍將軍／中護軍／征南將軍／
      永昌亭侯／鎮東將軍／鎮軍將軍逐項核對來源；補上先前遺漏的鎮東將軍
- [x] 箕谷「斂眾固守，不至大敗」（正文）與親自斷後、軍資幾乎未失（裴注）
      已拆開標註
- [x] 「病逝」改為「去世」，並註明《三國志》正文未記載死因
- [x] 追諡年月引《三國志‧後主傳》，詔書與姜維議文標明出自《雲別傳》，
      「蜀漢生前獲諡者極少」已改寫為「授諡範圍較窄……時論以為榮」
- [x] 馬雲祿改回「馬雲騄」，關係與來源都已修正為後世文學（反三國演義）
- [x] 移除來源不明的評語，當世／後世評價全部附上可核對的具體出處
- [x] 楊戲贊語已標明是趙雲、陳到合贊；陳壽評語已標明是五人合評、西晉
      史家評語
- [x] 長坂坡「七進七出」改為後世概括說法而非小說明文；截江奪阿斗補上
      史實差異
- [x] `data/index.json` 只放輕量欄位，`sources.json`／`factions.json`
      共用目錄已建立，人物內容透過 `sourceId` 引用；`schemaVersion`／
      `dataStatus`／`published`／`lastReviewedAt` 已加入
- [x] `personLinkOrPlain` 改為先查 `index.json` 確認人物存在且已發布
      才連結，且不再要求人物 JSON 重複手動填其他人物的頭像路徑
- [x] 頁籤補上方向鍵／Home／End 鍵盤導覽（roving tabindex），且改用
      `pushState` 讓瀏覽器上一頁／下一頁能在切換過的頁籤間正確來回
- [x] 已用 Node + jsdom 做過一輪無頭瀏覽器煙霧測試：首頁篩選/搜尋、
      詳細頁四個區塊渲染數量、頁籤點擊與鍵盤切換、瀏覽器上一頁/下一頁、
      找不到人物的錯誤頁，皆已實際執行驗證且沒有「來源目錄缺漏」警示

## 之後可能想做的事

- 現階段一位人物一份 JSON 還很夠用；如果之後單一人物資料量大到難以
  維護，可以再拆成 `profile.json`／`overview.json`／`history.json`／
  `romance.json`／`works.json`，資料夾結構已經是 `data/characters/`
  預留了這個彈性
- 更多人物建檔後，記得回來把趙雲 `factionTimeline` 裡對應的 `personId`
  補上（目前公孫瓚、劉備、劉禪都還是 `null`）
- 人物數量變多後，`data/index.json` 手動維護若變麻煩，可以考慮加一個
  小腳本自動掃描 `data/characters/` 資料夾產生索引
- 「張星彩」（現代遊戲對張飛兩位女兒的後世創作稱呼）之後如果要建檔，
  建議獨立成一個「後世虛構人物」條目，不要塞進任一位張氏、也不要當成
  張飛的第三個女兒。需要新增一個類似 `historicalPrototypes`（可能原型）
  的欄位指回敬哀皇后／劉禪繼后兩筆，跟現有 `personId` 只能指向單一人物
  的設計不同，屆時需要另外規劃 schema
- 來源目錄（`data/sources.json`）可以考慮加一個選填的 `url` 欄位，指向
  可查證的原始頁面（例如維基文庫、ctext.org 的原文頁，或現代遊戲的官方
  角色介紹頁）；畫面上的來源標籤有 `url` 的話就顯示成可點擊連結，讓
  讀者能直接點過去核對，不用只靠書名文字自己去找。要注意的是連結存活
  期不一定長久（尤其商業網站/遊戲官網比公版古籍網站更容易改版或下架），
  之後導入時要一併考慮連結失效要怎麼處理（例如定期抽查，或允許同一筆
  來源掛多個備援連結）