// 排程發布共用邏輯：作品／自訂頁面都用同一套規則判斷「現在」是否該顯示在前台
// 規則：published 為 false 一律視為草稿；published 為 true 時，如果有設定 publishAt
// 且還沒到那個時間，也還不算真的發布，等時間到了下一次讀取就會自動生效（不需要排程工作/佇列）
//
// 時區注意：<input type="datetime-local"> 送出的字串沒有時區資訊，若直接用 new Date(str) 解析，
// Node 會用「執行伺服器當下的系統時區」當作基準——本機開發是台北時間沒問題，
// 但正式環境（例如 Render）預設是 UTC，同一個字串解析出來的絕對時間會整整差 8 小時。
// 這裡固定假設使用者輸入/看到的都是台灣時間，明確帶上 +08:00 解析/格式化，
// 讓結果不受伺服器實際跑在哪個時區影響。
const DISPLAY_TIMEZONE = "Asia/Taipei";
const DISPLAY_OFFSET = "+08:00";

function toDate(value) {

    if (!value) {
        return null;
    }

    return value.toDate ? value.toDate() : new Date(value);

}

function isEffectivelyPublished(item) {

    if (!item || !item.published) {
        return false;
    }

    const publishAt = toDate(item.publishAt);

    if (!publishAt) {
        return true;
    }

    return publishAt.getTime() <= Date.now();

}

// 給後台列表用的狀態文字：草稿 / 已排程（時間）/ 已發布
function describeStatus(item) {

    if (!item.published) {
        return "草稿";
    }

    const publishAt = toDate(item.publishAt);

    if (publishAt && publishAt.getTime() > Date.now()) {
        return `已排程（${formatDatetimeLocal(item.publishAt)} 發布）`;
    }

    return "已發布";

}

// 把日期轉成 <input type="datetime-local"> 需要的格式，固定輸出台灣時間（不管伺服器實際時區）
function formatDatetimeLocal(value) {

    const date = toDate(value);

    if (!date) {
        return "";
    }

    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: DISPLAY_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    }).formatToParts(date).reduce((acc, part) => {
        acc[part.type] = part.value;
        return acc;
    }, {});

    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;

}

// 把表單送來的 datetime-local 字串（視為台灣時間）轉成 Date（沒填就回傳 null）
function parseDatetimeLocal(value) {

    if (!value) {
        return null;
    }

    const date = new Date(`${value}:00${DISPLAY_OFFSET}`);

    return isNaN(date.getTime()) ? null : date;

}

// 前台顯示用的日期格式（例如文章列表/詳細頁的發布日期），跟 formatDatetimeLocal 不同，
// 這個是給訪客看的、不是給 <input type="datetime-local"> 用的
function formatDisplayDate(value) {

    const date = toDate(value);

    if (!date) {
        return "";
    }

    return date.toLocaleDateString("zh-TW", { timeZone: DISPLAY_TIMEZONE, year: "numeric", month: "long", day: "numeric" });

}

module.exports = { isEffectivelyPublished, describeStatus, formatDatetimeLocal, parseDatetimeLocal, formatDisplayDate };
