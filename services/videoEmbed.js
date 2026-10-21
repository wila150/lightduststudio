// 把 YouTube/Vimeo 的一般分享連結轉成可以嵌入 iframe 播放的網址；不是這兩種連結就回傳 null（代表當作直接的影片檔案網址處理）
function getEmbedUrl(url) {

    if (!url) {
        return null;
    }

    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);

    if (youtubeMatch) {
        const id = youtubeMatch[1];
        return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&playsinline=1&rel=0`;
    }

    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);

    if (vimeoMatch) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1&loop=1&background=1`;
    }

    return null;

}

// 沒有手動上傳封面照時的備援縮圖：YouTube 影片可以直接組出官方縮圖網址，不用另外呼叫 API
function getThumbnailUrl(url) {

    if (!url) {
        return null;
    }

    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);

    if (youtubeMatch) {
        return `https://img.youtube.com/vi/${youtubeMatch[1]}/hqdefault.jpg`;
    }

    return null;

}

// 給作品內頁直接嵌入的播放器用：跟 getEmbedUrl 不同，這裡要有聲音、有控制列、不自動播放、不重複播放
// （getEmbedUrl 是給背景影片用的靜音自動循環版）
function getPlayerUrl(url) {

    if (!url) {
        return null;
    }

    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);

    if (youtubeMatch) {
        return `https://www.youtube.com/embed/${youtubeMatch[1]}?rel=0&playsinline=1&modestbranding=1`;
    }

    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);

    if (vimeoMatch) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    return null;

}

// 直式短影音（Shorts）的直式縮圖：YouTube 的 oar2.jpg 是直的（1080×1920 或 4:5），沒有一般縮圖兩側的黑邊
// 不是 YouTube 連結就回傳 null；萬一那支影片沒有直式縮圖，呼叫端用 onerror 退回一般縮圖
function getPortraitThumbnailUrl(url) {

    const thumb = getThumbnailUrl(url);

    return thumb && thumb.indexOf("img.youtube.com") !== -1 ? thumb.replace("img.youtube.com", "i.ytimg.com").replace("hqdefault.jpg", "oar2.jpg") : null;

}

module.exports = { getEmbedUrl, getThumbnailUrl, getPlayerUrl, getPortraitThumbnailUrl };
