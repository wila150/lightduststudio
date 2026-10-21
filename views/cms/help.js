const { ASSET_VERSION } = require("../../config/version");

// 後台「使用說明」：藍點後台操作手冊（版型沿用 2026/09 交付的操作手冊，2026/10/02 起改放在後台 /cms/help）
// 整頁獨立輸出、不包後台 layout，樣式在 public/css/help.css，截圖在 public/images/help/
// 內容用詞對齊後台畫面上的按鈕／欄位名稱；改了後台功能記得回來改這裡，並更新頁尾的整理日期

const shot = (name, alt) => `<img src="/images/help/${name}.jpg?v=${ASSET_VERSION}" alt="${alt}" loading="lazy">`;

module.exports = () => `<!doctype html>
<html lang="zh-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex">
<title>藍點後台操作手冊</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800&family=Noto+Sans+TC:wght@400;500;700;900&display=swap">
<link rel="stylesheet" href="/css/help.css?v=${ASSET_VERSION}">
</head>
<body>

<header class="hero">
  <div class="hero-in">
    <p class="brand"><span class="dot"></span>BLUE DOT STUDIO</p>
    <h1><span class="en">CMS MANUAL</span>藍點後台操作手冊</h1>
    <p class="sub">上架影片、整理照片、改頁面、調選單，全部在後台完成，存檔後前台立刻更新。先在下面選你要做的事，直接跳到那一段。</p>
    <div class="hero-actions">
      <a class="back" href="/cms">← 回到後台</a>
      <p class="url">後台網址 <code>bluedot-slaj.onrender.com/cms</code></p>
    </div>
  </div>
</header>

<div class="wrap">

<div class="tasks">
  <a class="task r-blue" href="#video"><i>最常用</i><b>上架一支影片</b><span>貼 YouTube 連結，縮圖和播放器自動產生</span></a>
  <a class="task r-blue" href="#vertical"><i>短影音</i><b>直式影片 9:16</b><span>Shorts／Reels 的縮圖和播放器改直式</span></a>
  <a class="task r-blue" href="#photo"><i>作品</i><b>上架一組照片</b><span>建立作品、上傳相簿、選封面</span></a>
  <a class="task r-blue" href="#bulk"><i>最快</i><b>一次上傳多個作品</b><span>選資料夾，自動建好標題、封面、相簿</span></a>
  <a class="task r-blue" href="#order"><i>相簿</i><b>調整照片順序</b><span>拖拉、置頂、依檔名一鍵排序</span></a>
  <a class="task r-sand" href="#category"><i>分類</i><b>新增或調整分類</b><span>名稱、說明、排序、下拉選單</span></a>
  <a class="task r-teal" href="#module"><i>排版</i><b>改頁面內容</b><span>用模組疊出版面</span></a>
  <a class="task r-plum" href="#nav"><i>選單</i><b>改導覽列</b><span>項目、順序、下拉分類</span></a>
  <a class="task r-slate" href="#media"><i>媒體庫</i><b>找相簿、整理照片</b><span>搜尋相簿、分類分頁、上傳</span></a>
</div>

<nav class="nav" aria-label="章節">
  <ul>
    <li class="r-slate"><a href="#start">後台地圖</a></li>
    <li class="r-blue"><a href="#video">影片作品</a></li>
    <li class="r-blue"><a href="#photo">照片作品</a></li>
    <li class="r-sand"><a href="#category">分類</a></li>
    <li class="r-teal"><a href="#page">頁面</a></li>
    <li class="r-teal"><a href="#module">模組排版</a></li>
    <li class="r-plum"><a href="#nav">導覽列</a></li>
    <li class="r-slate"><a href="#media">媒體庫</a></li>
    <li class="r-slate"><a href="#settings">首頁與設定</a></li>
    <li class="r-alert"><a href="#faq">出問題怎麼辦</a></li>
  </ul>
</nav>

<!-- ═══════ 後台地圖 ═══════ -->
<section id="start" class="r-slate">
  <div class="head">
    <p class="kicker">開始之前</p>
    <h2>後台地圖</h2>
    <p>選單在最上方，分成「內容管理」「線上預約」「系統」三組，滑鼠移上去就會展開；最右邊的「使用說明」就是這份手冊。90% 的工作都在「內容管理 → 自訂頁面」裡完成：FILM、PHOTOGRAPH、OUR STORY 都是自訂頁面。</p>
  </div>

  <div class="duo">
    <div style="display:grid;gap:14px">
      <figure class="real" style="margin-top:0">
        <p class="label">實際後台畫面</p>
        <div class="shot">${shot("cms-menu", "後台最上方的選單列，內容管理下拉展開：首頁管理、自訂頁面、媒體庫、留言")}</div>
        <figcaption>滑鼠移到「內容管理」展開的選單。</figcaption>
      </figure>
      <div class="tw"><table style="min-width:0">
        <thead><tr><th>選單</th><th>裡面有什麼</th></tr></thead>
        <tbody>
          <tr><td><b>內容管理</b></td><td>首頁管理、<b>自訂頁面</b>、媒體庫</td></tr>
          <tr><td><b>留言</b></td><td>聯絡表單與 LINE 訊息的收件匣：未讀／星號／來源篩選、搜尋、全部標為已讀；刪除可在「最近刪除」復原</td></tr>
          <tr><td><b>即時統計</b></td><td>目前在線、今日／7 天瀏覽、熱門頁面與作品；右上角可「開啟桌面通知」，有新留言會跳通知</td></tr>
          <tr><td><b>線上預約</b></td><td>預約管理、服務項目、預約人員、預約設定</td></tr>
          <tr><td><b>系統</b></td><td>導覽列管理、網站設定、帳號管理、修改密碼</td></tr>
          <tr><td><b>使用說明</b></td><td>這份操作手冊</td></tr>
        </tbody>
      </table></div>
    </div>

    <div class="cards" style="grid-template-columns:1fr">
      <div class="card"><span class="tag">習慣 1</span><h4>每一塊各自存檔</h4><p>頁面資料、每個模組、每個作品都有自己的「儲存」。改哪一塊就按那一塊的儲存。照片排序例外：拖完放開就自動存。</p></div>
      <div class="card"><span class="tag">習慣 2</span><h4>看右邊的即時預覽</h4><p>編輯頁面時右側有預覽，可切換「電腦版／手機版」，存檔後自動更新。</p></div>
      <div class="card"><span class="tag">習慣 3</span><h4>前台沒變就重新整理</h4><p>電腦按 Cmd＋Shift＋R（Windows：Ctrl＋Shift＋R）；手機把分頁關掉再開。還是沒變，確認剛剛有沒有按到儲存。</p></div>
    </div>
  </div>
</section>

<!-- ═══════ 影片作品 ═══════ -->
<section id="video" class="r-blue">
  <div class="head">
    <p class="kicker">最常用</p>
    <h2>上架一支影片</h2>
    <p>只要貼 YouTube 連結：清單自動用影片縮圖當封面，內頁自動嵌入播放器，不用另外做封面。</p>
    <div class="path"><span>內容管理</span><em>→</em><span>自訂頁面</span><em>→</em><span>FILM 的「編輯」</span><em>→</em><span>分類與項目</span><em>→</em><span>＋ 新增項目</span></div>
  </div>

  <div class="duo">
    <ol class="steps">
      <li><b>先貼連結</b><span>在「連結」貼上 YouTube／Vimeo 網址（<code>watch?v=…</code>、<code>youtu.be/…</code>、<code>shorts/…</code> 都可以），等一秒。</span></li>
      <li><b>自動帶入</b><span>標題（去掉頻道後綴）、網址代稱（翻成英文）、SEO 描述、影片比例（Shorts 自動選 9:16）會自己填好，下方出現影片縮圖。只會填空白的欄位，已經填過的不會被蓋掉。</span></li>
      <li><b>檢查、微調</b><span>標題可以按 Enter 換行；網址代稱是機器翻譯，覺得怪可以改（上線後不要再改，舊網址會失效）。網址代稱留空也可以，存檔時會自動產生。</span></li>
      <li><b>分類 → 勾「發布」→ 儲存</b><span>選它屬於哪一類（例如「短影音／Reels」）。封面、相簿都不用填，存完就上線。</span></li>
    </ol>

    <div class="mock">
      <div class="mock-bar"><i></i><i></i><i></i><b>FILM › 新增項目</b></div>
      <div class="mock-body">
        <div class="fld hl"><label>標題</label><div class="in">寶島神很大 x 三立電視台 x 乖乖 x 青山宮聯名 宣傳短片</div><span class="pin">1</span></div>
        <div class="fld hl"><label>網址代稱</label><div class="in">formosa-gods-sanlih-kuaikuai-promo</div><span class="pin">2</span></div>
        <div class="fld hl"><label>SEO 描述</label><div class="in">藍點影像工作室製作寶島神很大 x 三立電視台 x 乖乖 x 青山宮聯名商品宣傳短片……</div><span class="pin">3</span></div>
        <div class="fld hl"><label>連結（選填）</label><div class="in">https://www.youtube.com/watch?v=lNzdKLpK3oQ</div><span class="pin">4</span></div>
        <div class="row2">
          <div class="fld hl"><label>影片比例</label><div class="in">9:16 直式（短影音） ▾</div><span class="pin">5</span></div>
          <div class="fld hl"><label>分類</label><div class="in">短影音／Reels ▾</div><span class="pin">6</span></div>
        </div>
        <div class="chk">發布（顯示於清單頁）</div>
        <span class="btn">儲存</span>
      </div>
    </div>
  </div>

  <div class="duo">
    <figure class="real scroll">
      <p class="label">實際後台畫面：新增項目</p>
      <div class="shot">${shot("item-form", "後台新增項目表單：封面圖片、標題、網址代稱、描述、SEO 描述、連結、分類")}</div>
      <figcaption>新增項目的完整表單（可捲動）。「影片比例」在「連結」欄位的正下方。</figcaption>
    </figure>
    <figure class="real scroll">
      <p class="label">實際後台畫面：分類與項目</p>
      <div class="shot">${shot("film-categories", "FILM 編輯頁的分類與項目區塊：分類管理清單與作品項目清單")}</div>
      <figcaption>FILM 編輯頁往下捲的「分類與項目」：上面是分類，下面是作品和「＋ 新增項目」。先點分類標籤再新增，作品會自動歸到那個分類。</figcaption>
    </figure>
  </div>

  <h3>存檔後前台長這樣</h3>
  <figure>
    <div class="shot">${shot("item-page", "作品內頁：標題、分類標籤，下方是嵌入的 YouTube 播放器")}</div>
    <figcaption>作品內頁：YouTube 播放器自動嵌入。清單頁的縮圖也是從影片自動抓的。</figcaption>
  </figure>

  <div class="note"><strong>想換封面？</strong>沒上傳封面就自動用 YouTube 縮圖；在作品編輯頁上傳「封面圖片」（會依影片比例裁成 16:9 或 3:4），清單、作品頁、首頁輪播就都改用你的封面。想改回 YouTube 縮圖，按「移除封面」即可。Vimeo 影片不會自動抓縮圖，請自己上傳封面。</div>

  <h3 id="vertical">直式短影音（9:16）</h3>
  <p class="lead">Shorts、Reels 這類直式影片，「影片比例」是 <b>9:16 直式</b>（貼 Shorts 連結會自動選好）：FILM 清單的封面固定用 3:4 直式（手機一排兩張），點進去的播放器是 9:16 直式，左右不會有黑邊。</p>
  <div class="shots" style="margin-top:14px">
    <figure>
      <div class="shot">${shot("film-reels", "FILM 短影音分類：橫式影片的縮圖是 16:9，直式影片的縮圖是 9:16")}</div>
      <figcaption>短影音分類：直式影片用 9:16 縮圖；本身是橫式的影片（例如宣傳片）維持 16:9。</figcaption>
    </figure>
    <figure>
      <div class="shot">${shot("reel-player", "直式短影音的作品內頁，播放器是直式 9:16")}</div>
      <figcaption>點進去的播放器也是直式，按下播放後維持直式。</figcaption>
    </figure>
  </div>
  <div class="note"><strong>新增影片時</strong>「影片比例」預設是 16:9 橫式，上架短影音記得改成 9:16。影片在 YouTube 上是橫的、卻設成 9:16，畫面左右會被裁掉。</div>
</section>

<!-- ═══════ 照片作品 ═══════ -->
<section id="photo" class="r-blue">
  <div class="head">
    <p class="kicker">作品</p>
    <h2>上架一組照片</h2>
    <p>照片作品要分兩步：先存檔建立作品，才會出現上傳相簿的區塊。</p>
    <div class="path"><span>內容管理</span><em>→</em><span>自訂頁面</span><em>→</em><span>PHOTOGRAPH 的「編輯」</span><em>→</em><span>＋ 新增項目</span></div>
  </div>

  <div class="duo">
    <ol class="steps">
      <li><b>填基本資料，先儲存</b><span>標題、網址代稱、SEO 描述、分類，勾「發布」後按儲存。</span></li>
      <li><b>加照片</b><span>用「選擇檔案」上傳（可以一次選多張、分次選會累加），或「從媒體庫選擇（可多選）」：先點分類資料夾、再點作品資料夾，按「全選這個資料夾」或勾選幾張 →「加入」。</span></li>
      <li><b>設封面</b><span>選最有代表性的一張；沒設定就用相簿第一張。人像的「封面焦點位置」選「偏上」，縮圖才不會切到頭。</span></li>
      <li><b>選相簿排版</b><span>方格、Masonry 石版、輪播、手風琴、拼貼、水平捲動，選完看下方預覽。</span></li>
      <li><b>填照片說明，儲存</b><span>每張照片可以填一句替代文字（alt），描述畫面內容，對 SEO 有幫助。</span></li>
    </ol>

    <div class="mock">
      <div class="mock-bar"><i></i><i></i><i></i><b>PHOTOGRAPH › 編輯項目 › 相簿</b></div>
      <div class="mock-body">
        <div class="row2">
          <div class="fld hl"><label>封面焦點位置</label><div class="in">偏上 ▾</div><span class="pin">3</span></div>
          <div class="fld hl"><label>相簿排版</label><div class="in">Masonry 石版 ▾</div><span class="pin">4</span></div>
        </div>
        <div class="fld hl"><label>照片</label>
          <div class="in" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:8px">
            <span style="aspect-ratio:3/4;border-radius:5px;background:linear-gradient(160deg,#4a5d78,#1d2536)"></span>
            <span style="aspect-ratio:3/4;border-radius:5px;background:linear-gradient(160deg,#9a7a5c,#3b2c20)"></span>
            <span style="aspect-ratio:3/4;border-radius:5px;background:linear-gradient(160deg,#6b8a88,#1f3331)"></span>
            <span style="aspect-ratio:3/4;border-radius:5px;border:2px dashed var(--line);display:grid;place-items:center;color:var(--ink-2);font-size:18px">＋</span>
          </div>
          <span class="pin">2</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><span class="btn ghost">選擇檔案</span><span class="btn ghost">從媒體庫選擇（可多選）</span></div>
        <span class="btn">儲存</span>
      </div>
    </div>
  </div>

  <h3 id="bulk">一次上傳多個作品：上傳相簿</h3>
  <p class="lead">照片已經在電腦裡分好資料夾（一個作品一個資料夾、封面照檔名叫「封面」）的話，不用一個一個新增作品。</p>
  <div class="duo">
    <ol class="steps">
      <li><b>點分類標籤</b><span>PHOTOGRAPH（或 FILM）的「分類與項目」，先點上方要放的分類，例如「婚慶/抓周/性別派對」。</span></li>
      <li><b>按「📤 上傳相簿到「分類」」</b><span>選電腦裡的資料夾：選一個作品資料夾，或選一個「裝了好幾個作品資料夾」的上層資料夾，一次建很多個。</span></li>
      <li><b>確認清單 → 等上傳完成</b><span>會先列出要建立的作品讓你確認，上傳進度顯示在按鈕下方，完成後頁面自動重新整理。</span></li>
    </ol>
    <div class="cards" style="grid-template-columns:1fr">
      <div class="card"><span class="tag">自動帶入</span><h4>每個資料夾＝一個作品</h4><p>標題＝資料夾名稱；封面＝檔名是「封面」的那張（沒有就用第一張）；相簿＝資料夾裡全部照片，照檔名排序、封面放第一張；直接發布。</p></div>
      <div class="card"><span class="tag">媒體庫</span><h4>照片同時進媒體庫</h4><p>放在跟分類同名的相簿底下（例如 媒體庫 › 婚慶/抓周/性別派對 › 作品名稱），之後也能從媒體庫再選。</p></div>
      <div class="card"><span class="tag">已經在媒體庫</span><h4>📁 從媒體庫資料夾建立作品</h4><p>照片已經傳到媒體庫的話，按這顆，勾選作品資料夾（可以多個、可以「全選這個分類的資料夾」）→「建立作品」。</p></div>
    </div>
  </div>
  <div class="note"><strong>不會重複</strong>同一個分類裡已經有同名作品的資料夾會自動跳過。名稱只差空白的資料夾（例如雲端硬碟上同名的不同場次）會分成「名稱」「名稱 Part 2」兩個作品，建好後可以到作品編輯頁改標題。</div>

  <h3 id="order">調整照片順序</h3>
  <p class="lead">作品編輯頁的照片縮圖區，每張左上角有順序編號。下面每一種操作都是放開／按下就<b>自動儲存</b>，不用再按儲存，前台相簿照這個順序顯示。</p>
  <figure class="real">
    <p class="label">實際後台畫面：照片排序</p>
    <div class="shot">${shot("photo-sort", "作品編輯頁的照片排序區：每張縮圖有順序編號、往前、往後、置頂、刪除，右上角有依檔名排序、順序反轉")}</div>
  </figure>
  <div class="cards" style="margin-top:16px">
    <div class="card"><span class="tag">最直覺</span><h4>直接拖拉</h4><p>按住整張縮圖拖到想要的位置放開。</p></div>
    <div class="card"><span class="tag">微調</span><h4>◀ ▶ 移一格</h4><p>往前或往後移一個位置，手機上比拖拉好按。</p></div>
    <div class="card"><span class="tag">選封面感</span><h4>置頂</h4><p>把這張直接移到第一張。</p></div>
    <div class="card"><span class="tag">一鍵</span><h4>依檔名排序</h4><p>照相機檔名排，通常就是拍攝順序；檔名有「封面」的排最前面。</p></div>
    <div class="card"><span class="tag">一鍵</span><h4>順序反轉</h4><p>整本相簿倒過來排。</p></div>
  </div>
  <div class="note"><strong>從媒體庫選照片</strong>選擇視窗跟電腦的資料夾一樣：最上層是分類（例如「婚慶/抓周/性別派對」），點進去是每個作品的相簿，再點進去才是照片，照檔名排序。上方可以搜尋資料夾名稱、點「媒體庫 › 分類」回上一層；勾選的照片切換資料夾也會保留，最後一起按「加入」。下次打開會停在上次的資料夾。</div>
  <div class="note"><strong>封面會在相簿裡嗎？</strong>從 Google Drive 匯入的 PHOTOGRAPH 作品，封面已經放在相簿第一張。在後台自己新增的作品，封面不會自動加進相簿；想讓封面也出現在內頁，在「照片」把同一張再上傳一次。</div>

  <h3>其他常用操作</h3>
  <div class="cards">
    <div class="card"><span class="tag">排序</span><h4>作品順序：拖拉 ⠿</h4><p>在「分類與項目」的作品列表按住左邊的 ⠿ 拖拉，最上面的排在前台最前面。</p></div>
    <div class="card"><span class="tag">排程</span><h4>指定上架時間</h4><p>填「排程發布時間」，到時間才會對外顯示。</p></div>
    <div class="card"><span class="tag">隱藏</span><h4>先藏起來</h4><p>取消勾選「發布」，前台就看不到，資料都還在。</p></div>
    <div class="card"><span class="tag">預覽</span><h4>上線前先看</h4><p>編輯頁上方「預覽這個項目」可以先看內頁效果。</p></div>
  </div>
</section>

<!-- ═══════ 分類 ═══════ -->
<section id="category" class="r-sand">
  <div class="head">
    <p class="kicker">分類</p>
    <h2>新增或調整分類</h2>
    <p>分類決定作品在哪個標籤底下，也會自動出現在導覽列的下拉選單。</p>
    <div class="path"><span>內容管理</span><em>→</em><span>自訂頁面</span><em>→</em><span>FILM／PHOTOGRAPH 的「編輯」</span><em>→</em><span>分類管理</span></div>
  </div>

  <div class="duo">
    <ol class="steps">
      <li><b>新增</b><span>在「分類管理」填分類名稱（例如「商業與美食攝影」），按「新增分類」。</span></li>
      <li><b>寫分類說明</b><span>按分類旁的「編輯」，填「分類說明」。有說明的分類頁會換成右邊這種版頭：英文大標、中文名稱、置中說明。</span></li>
      <li><b>排順序</b><span>按住分類左邊的 ⠿ 拖拉，標籤列和下拉選單會一起變。</span></li>
      <li><b>刪除：先把作品移走</b><span>先到每個作品的編輯頁，把「分類」改成別的分類，再回來按「刪除」。</span></li>
    </ol>
    <figure>
      <div class="shot">${shot("category-page", "FILM 的 SDE 快播快剪分類頁：英文大標 SAME-DAY EDIT、中文名稱、分類標籤列與置中說明")}</div>
      <figcaption>有填分類說明的分類頁（SDE 快播快剪）。</figcaption>
    </figure>
  </div>

  <figure class="real narrow">
    <p class="label">實際後台畫面：編輯分類</p>
    <div class="shot">${shot("category-form", "後台編輯分類表單：分類名稱、分類說明、上層分類、分類封面照")}</div>
  </figure>

  <div class="note warn"><strong>直接刪除分類的話</strong>底下的作品不會被刪，但前台的分類標籤會找不到它們，等於從網站上消失。刪除前請先把作品改到其他分類。</div>
  <div class="note"><strong>分類沒出現在標籤列？</strong>沒有作品、也沒填說明的分類會自動藏起來；有填說明的分類，即使沒作品也會顯示。分類頁的英文大標目前沒有後台欄位，要改請聯絡站務。</div>
</section>

<!-- ═══════ 頁面 ═══════ -->
<section id="page" class="r-teal">
  <div class="head">
    <p class="kicker">頁面</p>
    <h2>做一個新頁面</h2>
    <p>建立時要先選頁面類型，建立後就不能改。</p>
    <div class="path"><span>內容管理</span><em>→</em><span>自訂頁面</span><em>→</em><span>新增頁面</span></div>
  </div>

  <div class="vs">
    <div class="card"><span class="tag">一般內容頁</span><h4>用模組自由排版</h4>
      <ul><li>OUR STORY、CONTACT US、服務介紹</li><li>內容靠「模組」一塊一塊疊</li><li>見下一段「改頁面內容」</li></ul></div>
    <div class="card"><span class="tag">分類清單頁</span><h4>放一整批作品</h4>
      <ul><li>FILM、PHOTOGRAPH、文章</li><li>底下新增分類與作品</li><li>見上面「影片／照片作品」</li></ul></div>
  </div>

  <div class="duo" style="margin-top:22px">
    <ol class="steps">
      <li><b>標題與副標</b><span>例如「FILM」／「動態攝影」。滑鼠移到導覽列的項目時，也會滑出這個副標。</span></li>
      <li><b>網址代稱</b><span>頁面網址會是 <code>/p/代稱</code>。</span></li>
      <li><b>頁面類型</b><span>一般內容頁或分類清單頁，建立後不能改。</span></li>
      <li><b>SEO 描述</b><span>這一頁在 Google 的說明，不填就用全站預設。</span></li>
      <li><b>勾「發布」→ 儲存頁面基本資料</b><span>要出現在導覽列，另外到「導覽列管理」新增。</span></li>
    </ol>
    <div class="mock">
      <div class="mock-bar"><i></i><i></i><i></i><b>自訂頁面 › 新增頁面</b></div>
      <div class="mock-body">
        <div class="row2">
          <div class="fld hl"><label>標題</label><div class="in en">FILM</div><span class="pin">1</span></div>
          <div class="fld"><label>副標</label><div class="in">動態攝影</div></div>
        </div>
        <div class="fld hl"><label>網址代稱</label><div class="in">film</div><span class="pin">2</span></div>
        <div class="fld hl"><label>頁面類型（建立後無法更改）</label><div class="in">分類清單頁 ▾</div><span class="pin">3</span></div>
        <div class="fld"><label>SEO 描述</label><div class="in muted">選填</div></div>
        <div class="chk">發布（顯示於前台導覽列與 /p/代稱）</div>
        <span class="btn">儲存頁面基本資料</span>
      </div>
    </div>
  </div>

  <figure class="real">
    <p class="label">實際後台畫面：自訂頁面列表</p>
    <div class="shot">${shot("custom-pages", "後台自訂頁面列表，每一頁有編輯、刪除按鈕")}</div>
  </figure>

  <div class="note warn"><strong>刪除頁面前</strong>分類清單頁刪除時，底下所有分類和作品會一起刪掉，無法復原。</div>
</section>

<!-- ═══════ 模組 ═══════ -->
<section id="module" class="r-teal">
  <div class="head">
    <p class="kicker">排版</p>
    <h2>改頁面內容：模組</h2>
    <p>首頁、內容頁、作品內頁都是一個個模組由上往下疊起來的。每個模組各自編輯、各自存檔。</p>
  </div>

  <div class="duo">
    <ol class="steps">
      <li><b>新增</b><span>在頁面編輯頁最下方選模組類型，按「＋ 新增模組」。</span></li>
      <li><b>填內容</b><span>選取文字會浮出工具列，可以調字型、顏色、對齊。</span></li>
      <li><b>按「儲存這個模組」</b><span>上傳圖片後也一定要再按一次，不然圖片不會存進頁面。</span></li>
      <li><b>調順序、刪除</b><span>拖拉 ⠿，或用 ▲ ▼ 上移／下移；刪除無法復原。</span></li>
    </ol>
    <div class="mock">
      <div class="mock-bar"><i></i><i></i><i></i><b>首頁管理 › 模組</b></div>
      <div class="mock-body">
        <div class="modcard">
          <header><span class="grip">⠿</span>圖文分欄<span class="act"><span>▲</span><span>▼</span><span>刪除</span></span></header>
          <div>
            <div class="fld"><label>大標題</label><div class="in">BLUEDOT</div></div>
            <div class="row2">
              <div class="fld"><label>圖片比例</label><div class="in">正方形 ▾</div></div>
              <div class="fld"><label>圖片</label><div class="in">2 張</div></div>
            </div>
            <div class="fld hl"><label>&nbsp;</label><div class="in" style="background:var(--navy);color:#fff;border-color:var(--navy);text-align:center;font-weight:700">儲存這個模組</div><span class="pin">3</span></div>
          </div>
        </div>
        <div class="fld hl"><label>新增模組</label><div class="in">標題 ▾　　＋ 新增模組</div><span class="pin">1</span></div>
      </div>
    </div>
  </div>

  <figure class="real narrow scroll">
    <p class="label">實際後台畫面：一個模組</p>
    <div class="shot">${shot("module-card", "編輯頁裡的一張模組卡片，上方有拖拉、上移、下移、刪除，下方有儲存這個模組")}</div>
  </figure>

  <h3>有哪些模組</h3>
  <div class="mods">
    <div class="mod"><div class="glyph"><svg viewBox="0 0 44 22"><rect x="4" y="6" width="36" height="8" rx="2" fill="currentColor" style="color:var(--role)"/></svg></div><b>標題</b><span>可調大小、粗細、對齊，手機會自動縮小</span></div>
    <div class="mod"><div class="glyph"><svg viewBox="0 0 44 22"><rect x="4" y="4" width="36" height="3" rx="1.5" fill="currentColor" style="color:var(--role)"/><rect x="4" y="10" width="30" height="3" rx="1.5" fill="currentColor" style="color:var(--role)"/><rect x="4" y="16" width="34" height="3" rx="1.5" fill="currentColor" style="color:var(--role)"/></svg></div><b>文字</b><span>一般段落</span></div>
    <div class="mod"><div class="glyph"><svg viewBox="0 0 44 22"><rect x="4" y="3" width="17" height="3" rx="1.5" fill="currentColor" style="color:var(--role)"/><rect x="4" y="9" width="14" height="3" rx="1.5" fill="currentColor" style="color:var(--role)"/><rect x="25" y="2" width="15" height="18" rx="2" fill="currentColor" style="color:var(--role)"/></svg></div><b>圖文分欄</b><span>左文右圖，可互換、可放多張圖</span></div>
    <div class="mod"><div class="glyph"><svg viewBox="0 0 44 22"><rect x="8" y="2" width="28" height="18" rx="2" fill="currentColor" style="color:var(--role)"/><polygon points="19,7 19,15 26,11" fill="var(--surface)"/></svg></div><b>影片</b><span>封面照＋點擊播放</span></div>
    <div class="mod"><div class="glyph"><svg viewBox="0 0 44 22"><rect x="2" y="6" width="9" height="10" rx="1.5" fill="currentColor" style="color:var(--role);opacity:.5"/><rect x="14" y="3" width="16" height="16" rx="2" fill="currentColor" style="color:var(--role)"/><rect x="33" y="6" width="9" height="10" rx="1.5" fill="currentColor" style="color:var(--role);opacity:.5"/></svg></div><b>精選作品輪播</b><span>首頁常用，作品換封面會自動更新</span></div>
    <div class="mod"><div class="glyph"><svg viewBox="0 0 44 22"><rect x="3" y="3" width="11" height="16" rx="1.5" fill="currentColor" style="color:var(--role)"/><rect x="16" y="3" width="11" height="16" rx="1.5" fill="currentColor" style="color:var(--role)"/><rect x="29" y="3" width="11" height="16" rx="1.5" fill="currentColor" style="color:var(--role)"/></svg></div><b>圖片相簿</b><span>多張照片，排版同作品相簿</span></div>
    <div class="mod"><div class="glyph"><svg viewBox="0 0 44 22"><rect x="2" y="8" width="8" height="6" rx="1" fill="currentColor" style="color:var(--role)"/><rect x="13" y="8" width="8" height="6" rx="1" fill="currentColor" style="color:var(--role)"/><rect x="24" y="8" width="8" height="6" rx="1" fill="currentColor" style="color:var(--role)"/><rect x="35" y="8" width="8" height="6" rx="1" fill="currentColor" style="color:var(--role)"/></svg></div><b>圖片跑馬燈</b><span>合作品牌 Logo 輪播</span></div>
    <div class="mod"><div class="glyph"><svg viewBox="0 0 44 22"><circle cx="7" cy="11" r="4" fill="currentColor" style="color:var(--role)"/><circle cx="22" cy="11" r="4" fill="currentColor" style="color:var(--role)"/><circle cx="37" cy="11" r="4" fill="currentColor" style="color:var(--role)"/><rect x="11" y="10" width="7" height="2" fill="currentColor" style="color:var(--role)"/><rect x="26" y="10" width="7" height="2" fill="currentColor" style="color:var(--role)"/></svg></div><b>服務流程步驟</b><span>步驟 1 → 2 → 3，可配線條圖示</span></div>
    <div class="mod"><div class="glyph"><svg viewBox="0 0 44 22"><rect x="3" y="3" width="17" height="7" rx="1.5" fill="currentColor" style="color:var(--role)"/><rect x="24" y="3" width="17" height="7" rx="1.5" fill="currentColor" style="color:var(--role)"/><rect x="3" y="12" width="17" height="7" rx="1.5" fill="currentColor" style="color:var(--role)"/><rect x="24" y="12" width="17" height="7" rx="1.5" fill="currentColor" style="color:var(--role)"/></svg></div><b>服務項目／特色卡片</b><span>服務介紹的宮格卡片</span></div>
    <div class="mod"><div class="glyph"><svg viewBox="0 0 44 22"><rect x="6" y="3" width="32" height="4" rx="1" fill="none" stroke="currentColor" style="color:var(--role)"/><rect x="6" y="10" width="32" height="4" rx="1" fill="none" stroke="currentColor" style="color:var(--role)"/><rect x="26" y="16" width="12" height="4" rx="1" fill="currentColor" style="color:var(--role)"/></svg></div><b>聯絡表單</b><span>送出後進到後台「留言」</span></div>
    <div class="mod"><div class="glyph"><svg viewBox="0 0 44 22"><rect x="8" y="3" width="28" height="17" rx="2" fill="none" stroke="currentColor" style="color:var(--role)"/><rect x="8" y="3" width="28" height="4" fill="currentColor" style="color:var(--role)"/><rect x="13" y="11" width="4" height="3" fill="currentColor" style="color:var(--role)"/><rect x="21" y="11" width="4" height="3" fill="currentColor" style="color:var(--role)"/></svg></div><b>線上預約區塊</b><span>訪客直接預約拍攝時段</span></div>
    <div class="mod"><div class="glyph"><svg viewBox="0 0 44 22"><rect x="6" y="7" width="32" height="8" rx="4" fill="currentColor" style="color:var(--role)"/></svg></div><b>按鈕、圖片、時間軸</b><span>連結按鈕、單張圖片、工作室歷程</span></div>
    <div class="mod"><div class="glyph"><svg viewBox="0 0 44 22"><rect x="4" y="3" width="36" height="7" rx="2" fill="currentColor" style="color:var(--role)"/><rect x="4" y="13" width="28" height="3" rx="1.5" fill="currentColor" style="color:var(--role);opacity:.5"/><rect x="4" y="18" width="22" height="3" rx="1.5" fill="currentColor" style="color:var(--role);opacity:.5"/></svg></div><b>常見問題（問與答）</b><span>一題一個，可展開；自動產生 Google／AI 搜尋讀得懂的問答資料（GEO）</span></div>
  </div>
</section>

<!-- ═══════ 導覽列 ═══════ -->
<section id="nav" class="r-plum">
  <div class="head">
    <p class="kicker">選單</p>
    <h2>改導覽列</h2>
    <p>網站最上方的 OUR STORY、SERVICES、PHOTOGRAPH、FILM……都在這裡設定，手機版的漢堡選單會自動同步。</p>
    <div class="path"><span>系統</span><em>→</em><span>導覽列管理</span><em>→</em><span>＋ 新增導覽項目</span></div>
  </div>

  <div class="duo">
    <ol class="steps">
      <li><b>顯示文字</b><span>例如「FILM」。</span></li>
      <li><b>指向哪裡</b><span>選一個自訂頁面，或填網址（站內路徑如 <code>/booking</code>，或完整外部網址）。</span></li>
      <li><b>勾「下拉顯示分類連結」</b><span>指向 FILM、PHOTOGRAPH 時勾選，滑鼠移上去會列出各分類。</span></li>
      <li><b>空分類要不要顯示</b><span>預設只列出有作品的分類。分類先建好、作品還沒上傳時，勾「還沒有作品的分類也顯示」。</span></li>
      <li><b>排順序</b><span>在列表拖拉 ⠿，由上到下＝前台由左到右。取消「啟用」可暫時隱藏。</span></li>
    </ol>
    <figure>
      <div class="shot">${shot("nav-dropdown", "滑鼠移到 FILM 時展開的分類下拉選單")}</div>
      <figcaption>勾選「下拉顯示分類連結」後，滑鼠移到 FILM 會展開分類。</figcaption>
    </figure>
  </div>

  <div class="duo">
    <figure class="real">
      <p class="label">實際後台畫面：導覽列管理</p>
      <div class="shot">${shot("nav-items", "後台導覽列管理列表")}</div>
    </figure>
    <figure class="real">
      <p class="label">實際後台畫面：編輯 FILM 導覽項目</p>
      <div class="shot">${shot("nav-item-form", "後台編輯導覽項目表單：顯示文字、指向類型、下拉顯示分類連結、空分類也顯示")}</div>
    </figure>
  </div>

  <h3>手機版</h3>
  <div class="shots">
    <div class="cards" style="grid-template-columns:1fr">
      <div class="card"><span class="tag">自動同步</span><h4>不用另外設定</h4><p>手機版漢堡選單直接用上面的導覽設定，有下拉分類的項目旁邊會出現圓框 ＋，點開就是分類。</p></div>
      <div class="card"><span class="tag">子頁面</span><h4>把頁面掛進下拉選單</h4><p>到那個頁面的編輯頁，「顯示在導覽列的位置」選要掛在哪個項目底下。</p></div>
    </div>
    <figure>
      <div class="shot phone">${shot("mobile-menu", "手機版漢堡選單：深色底、置中的大字選單項目")}</div>
    </figure>
  </div>
</section>

<!-- ═══════ 媒體庫 ═══════ -->
<section id="media" class="r-slate">
  <div class="head">
    <p class="kicker">媒體庫</p>
    <h2>找相簿、整理照片</h2>
    <p>網站上所有圖片都在媒體庫，依「分類 → 作品」兩層相簿整理。其他地方按「從媒體庫選擇」就能重複使用。</p>
    <div class="path"><span>內容管理</span><em>→</em><span>媒體庫</span></div>
  </div>

  <div class="duo">
    <ol class="steps">
      <li><b>搜尋相簿</b><span>最上面的搜尋框輸入名稱的一部分（例如 PAZZO、慈明、抓周），會列出符合的相簿和所屬分類；按 Enter 直接進入第一個。可以用空格輸入多個關鍵字。</span></li>
      <li><b>點分類分頁</b><span>例如「人像拍攝」，下方框裡會列出這個分類底下的每個作品相簿。</span></li>
      <li><b>看目前位置</b><span>「全部 › 人像拍攝 › 相簿名稱」，點前面的字可以回上一層。</span></li>
      <li><b>上傳</b><span>先進到要放的相簿，再把圖片拖進虛線框（或點選擇檔案），會直接歸到目前的相簿。<b>整個資料夾</b>也可以直接拖進來，或按「📁 上傳資料夾」：資料夾名稱自動變成相簿名稱（在「全部」時，第一層資料夾＝分類、裡面的子資料夾＝作品相簿）。</span></li>
      <li><b>整理</b><span>勾選照片後可以「移到這個相簿」或「刪除選取的檔案」。作品要用的照片，放進對應的作品相簿，之後「從媒體庫選擇」就能直接整個資料夾加入。</span></li>
    </ol>
    <figure class="real" style="margin-top:0">
      <p class="label">實際後台畫面：搜尋相簿</p>
      <div class="shot">${shot("media-search", "媒體庫搜尋框輸入 pazzo，下拉列出兩個 PAZZO 相簿與所屬分類")}</div>
    </figure>
  </div>

  <figure class="real">
    <p class="label">實際後台畫面：媒體庫</p>
    <div class="shot">${shot("media-library", "後台媒體庫：搜尋框、分類分頁、子相簿標籤、目前位置、上傳區與照片格線")}</div>
    <figcaption>選了「人像拍攝」裡的一個作品相簿：上面是分類分頁，下面框裡是這個分類的所有作品相簿，再往下是上傳區和照片。</figcaption>
  </figure>

  <div class="cards" style="margin-top:16px">
    <div class="card"><span class="tag">相簿管理</span><h4>新增、改名、刪除相簿</h4><p>點開「相簿管理」：可以新增相簿、改名、改上層分類。刪相簿不會刪照片，照片會變回「未分類」。</p></div>
    <div class="card"><span class="tag">合作品牌LOGO</span><h4>跑馬燈的 Logo</h4><p>新 Logo 先上傳到「合作品牌LOGO」相簿，再到首頁的「圖片跑馬燈」模組選進來。首頁是深色底，有白字版的請用白字版。</p></div>
  </div>

  <div class="note warn"><strong>刪媒體庫圖片前</strong>已經用在頁面上的圖片（例如首頁 BLUEDOT／藍點的照片、作品相簿），刪掉後那個位置會變成破圖。</div>
</section>

<!-- ═══════ 設定 ═══════ -->
<section id="settings" class="r-slate">
  <div class="head">
    <p class="kicker">全站</p>
    <h2>首頁與網站設定</h2>
    <p>不常改，但改一次影響整個網站。每個區塊改完都要按該區的「儲存」。</p>
  </div>

  <div class="cards">
    <div class="card"><span class="tag">首頁管理</span><h4>首頁主畫面</h4><p>主圖或全螢幕背景影片（貼 YouTube 連結，靜音循環）、首頁大 Logo（電腦／手機分開設寬度）、主標題與按鈕。下半部是首頁模組：作品輪播、BLUEDOT／藍點圖文、合作品牌跑馬燈。</p></div>
    <div class="card"><span class="tag">網站設定</span><h4>Logo 與外觀</h4><p>導覽列 Logo 與高度、分頁小圖示（favicon）、分享預覽圖（1200×630）、樣板與配色範本、自訂字體。</p></div>
    <div class="card"><span class="tag">網站設定</span><h4>SEO 與追蹤</h4><p>全站 SEO 描述與關鍵字、Google Analytics、Search Console 驗證碼。</p></div>
    <div class="card"><span class="tag">網站設定</span><h4>聯絡與通知</h4><p>頁尾電話、Email、社群連結；LINE 官方帳號通知設定完按「測試 LINE 連線」；表單防機器人（reCAPTCHA）。</p></div>
    <div class="card"><span class="tag">留言／預約</span><h4>客人的訊息</h4><p>聯絡表單與 LINE 訊息都在「留言」，可匯出 CSV。預約要先設服務項目、預約人員、可預約時段。</p></div>
  </div>

  <figure class="real scroll narrow">
    <p class="label">實際後台畫面：首頁管理</p>
    <div class="shot">${shot("home-settings", "後台首頁管理：首頁主圖、背景影片、首頁 Logo、主標題與按鈕設定")}</div>
  </figure>
</section>

<!-- ═══════ FAQ ═══════ -->
<section id="faq" class="r-alert">
  <div class="head">
    <p class="kicker">先看這裡</p>
    <h2>出問題怎麼辦</h2>
    <p>大部分狀況是「沒按到儲存」或「瀏覽器還在看舊的」。</p>
  </div>

  <details open><summary>存檔了，但前台沒變</summary><div>強制重新整理（電腦 Cmd＋Shift＋R／Ctrl＋Shift＋R）；手機把分頁關掉再開。確認按的是那一塊自己的「儲存」，不是別的區塊。</div></details>
  <details><summary>上傳的圖片沒出現</summary><div>上傳完會提示「記得按儲存這個模組」，要再按一次儲存，圖片才會存進頁面。</div></details>
  <details><summary>作品沒出現在清單</summary><div>檢查三件事：「發布」有沒有勾、排程時間是不是還沒到、分類有沒有選（分類被刪掉的作品也會找不到，重新選一個分類即可）。</div></details>
  <details open><summary>不小心刪掉作品／分類／照片</summary><div>作品清單（FILM／PHOTOGRAPH 的「分類與項目」）和媒體庫下方都有「🗑 最近刪除」，點開按「復原」就放回原處（網址、分類、排序都不變），也可以「全部復原」。確定不要的才按「永久刪除」，那時照片檔案才會真的刪掉。</div></details>
  <details><summary>直式短影音變成橫的</summary><div>作品編輯頁的「影片比例」改成「9:16 直式」後儲存。</div></details>
  <details><summary>清單縮圖把人頭切掉了</summary><div>作品編輯頁的「封面焦點位置」改成「偏上」。</div></details>
  <details><summary>找不到某個相簿</summary><div>媒體庫最上面的搜尋框直接輸入名稱的一部分，不用一個一個分類點。</div></details>
  <details><summary>分類沒出現在下拉選單</summary><div>那個分類還沒有已發布的作品。到「導覽列管理」編輯該項目，勾「還沒有作品的分類也顯示在下拉選單」。</div></details>
  <details><summary>影片作品沒有封面</summary><div>「連結」要貼 YouTube 網址。Vimeo 不會自動抓縮圖，請手動上傳封面圖片。</div></details>
  <details><summary>改了網址代稱，舊連結壞掉</summary><div>舊網址不會自動轉到新網址。已經分享出去的作品，盡量不要改代稱。</div></details>

  <div class="note"><strong>每次改完</strong>把預覽切到「手機版」，或直接用手機打開網站看一次：文字有沒有被切到、圖片比例對不對。</div>
</section>

<footer class="foot">藍點影像工作室 Blue Dot Studio｜後台操作手冊。依 2026 年 10 月的後台功能整理，畫面以實際後台為準。</footer>

</div>

</body>
</html>`;
