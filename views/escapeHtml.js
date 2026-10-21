// 用來輸出「訪客自己填寫、未經過任何人審核」的欄位（留言、預約的姓名/Email/電話等）
// 跟站方自己在後台編輯的內容（作品描述、自訂頁面內容）不一樣，後者本來就信任，這種不用跳脫
const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };

module.exports = function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value).replace(/[&<>"']/g, char => ENTITIES[char]);

};
