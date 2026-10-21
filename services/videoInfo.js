// 貼上影片連結就自動帶入作品資料（2026/10/03 回饋：貼連結就抓 YouTube 名稱、封面，網址代稱自動翻譯，不用自己想）
// - 標題、縮圖：YouTube／Vimeo 官方 oEmbed（不需要 API 金鑰）
// - 直式或橫式：YouTube 的 /shorts/影片ID，是 Shorts 會直接 200，一般影片會轉址到 /watch
// - 網址代稱：把標題翻成英文再轉成 英文小寫-連字號；翻譯失敗就用影片 ID
const { getThumbnailUrl } = require("./videoEmbed");

const TIMEOUT_MS = 5000;

async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

function youtubeId(url) {
    const match = String(url || "").match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
    return match ? match[1] : null;
}

// 頻道上傳時自動加的「| 藍點 blue dot.」這類後綴，網站上不需要
function cleanTitle(title) {
    return String(title || "").replace(/\s*[|｜]\s*藍點.*$/i, "").replace(/\s+/g, " ").trim();
}

function slugify(text) {
    return String(text || "")
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .split("-").slice(0, 10).join("-")
        .slice(0, 70)
        .replace(/-+$/g, "");
}

async function translateToEnglish(text) {
    try {
        const url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=" + encodeURIComponent(text);
        const res = await fetchWithTimeout(url);
        if (!res.ok) return "";
        const data = await res.json();
        return (data[0] || []).map(part => part[0]).join("");
    } catch (error) {
        return "";
    }
}

async function isYoutubeShort(id) {
    try {
        const res = await fetchWithTimeout(`https://www.youtube.com/shorts/${id}`, { method: "HEAD", redirect: "manual" });
        return res.status === 200;
    } catch (error) {
        return false;
    }
}

// 由標題產生網址代稱（貼連結自動帶入、存檔時代稱空白都會用到）
async function slugFromTitle(title, fallback) {
    const english = /[^\x00-\x7f]/.test(title) ? await translateToEnglish(title) : title;
    return slugify(english) || slugify(fallback) || `item-${Date.now().toString(36)}`;
}

async function getVideoInfo(url) {

    const id = youtubeId(url);
    const isVimeo = /vimeo\.com\//.test(url || "");

    if (!id && !isVimeo) {
        return null;
    }

    const oembedUrl = id
        ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`
        : `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;

    let title = "";
    let thumbnailUrl = id ? getThumbnailUrl(url) : "";

    try {
        const res = await fetchWithTimeout(oembedUrl);
        if (res.ok) {
            const data = await res.json();
            title = cleanTitle(data.title);
            thumbnailUrl = thumbnailUrl || data.thumbnail_url || "";
        }
    } catch (error) {
        // 抓不到標題就只回縮圖，讓使用者自己填
    }

    const [isShort, slug] = await Promise.all([
        id ? isYoutubeShort(id) : Promise.resolve(false),
        title ? slugFromTitle(title, id || "") : Promise.resolve(id ? `video-${id.toLowerCase()}` : "")
    ]);

    return {
        title,
        thumbnailUrl,
        videoRatio: isShort ? "9:16" : "16:9",
        slug,
        metaDescription: title ? `藍點影像工作室拍攝製作：${title}。` : ""
    };

}

module.exports = { getVideoInfo, slugFromTitle, slugify, cleanTitle };
