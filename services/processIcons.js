// 服務流程步驟（processStep）可選的內建線條圖示
// 用 stroke="currentColor" 畫，顏色跟著 CSS 的 .process-step-icon（網站強調色）走，換主題不用改圖
// 後台編輯器的下拉選單、前台渲染都讀這份；要新增圖示就在這裡加一筆

const svg = paths => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

const PROCESS_ICONS = {
    chat: {
        label: "對話（諮詢）",
        svg: svg(`<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>`)
    },
    plan: {
        label: "清單（規劃）",
        svg: svg(`<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M9 10h6M9 14h6M9 18h3"/>`)
    },
    location: {
        label: "定位（場勘）",
        svg: svg(`<path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>`)
    },
    calendar: {
        label: "行事曆（預約）",
        svg: svg(`<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>`)
    },
    camera: {
        label: "相機（拍攝）",
        svg: svg(`<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>`)
    },
    video: {
        label: "攝影機（錄影）",
        svg: svg(`<rect x="2.5" y="6" width="13" height="12" rx="2"/><path d="M15.5 10.5 21.5 7v10l-6-3.5"/>`)
    },
    edit: {
        label: "調色（後製）",
        svg: svg(`<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>`)
    },
    photos: {
        label: "相片（交件）",
        svg: svg(`<rect x="7" y="3" width="14" height="14" rx="2"/><path d="M17 21H5a2 2 0 0 1-2-2V7"/><path d="m7 14 3.5-3.5 3 3 2-2L21 16"/><circle cx="16.5" cy="7.5" r="1.2"/>`)
    },
    heart: {
        label: "愛心（售後）",
        svg: svg(`<path d="M12 20s-7.5-4.6-9-9.3C2 7.4 4.3 4.5 7.4 4.5c2 0 3.5 1.1 4.6 2.7 1.1-1.6 2.6-2.7 4.6-2.7 3.1 0 5.4 2.9 4.4 6.2C19.5 15.4 12 20 12 20z"/>`)
    },
    spark: {
        label: "靈感（企劃）",
        svg: svg(`<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z"/>`)
    }
};

// 沒有選圖示（空字串）時，依步驟順序自動套用；選「none」則不顯示圖示
const DEFAULT_ICON_ORDER = ["chat", "plan", "camera", "photos", "heart"];

function resolveProcessIcon(icon, stepNumber) {

    if (icon === "none") {
        return "";
    }

    if (!icon) {
        const key = DEFAULT_ICON_ORDER[(stepNumber - 1) % DEFAULT_ICON_ORDER.length];
        return PROCESS_ICONS[key].svg;
    }

    return PROCESS_ICONS[icon] ? PROCESS_ICONS[icon].svg : null;

}

module.exports = { PROCESS_ICONS, resolveProcessIcon };
