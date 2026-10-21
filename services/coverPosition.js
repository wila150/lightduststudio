const COVER_POSITIONS = [
    { value: "center top", label: "偏上（預設，人像保住臉）" },
    { value: "center 25%", label: "稍微偏上" },
    { value: "center center", label: "置中" },
    { value: "center 75%", label: "稍微偏下" },
    { value: "center bottom", label: "偏下" },
    { value: "left center", label: "偏左" },
    { value: "right center", label: "偏右" }
];

const DEFAULT_COVER_POSITION = "center top";

function sanitizeCoverPosition(value) {
    return COVER_POSITIONS.some(option => option.value === value) ? value : DEFAULT_COVER_POSITION;
}

// 給前台 <img> 用的 inline style；沒設定就不輸出，沿用 CSS 預設
function coverStyleAttr(item) {
    const position = item && item.coverPosition;
    return position && COVER_POSITIONS.some(option => option.value === position) ? ` style="object-position:${position};"` : "";
}

module.exports = { COVER_POSITIONS, DEFAULT_COVER_POSITION, sanitizeCoverPosition, coverStyleAttr };
