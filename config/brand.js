// 品牌資料集中在這裡：SEO 結構化資料、llms.txt、影片自動填入說明等都從這裡取。
// 網站名稱、聯絡資訊、社群連結以後台「網站設定」為準，這裡只放後台沒有欄位的品牌常數。
module.exports = {
    name: "光塵影像工作室",
    nameEn: "LightDust Studio",
    alternateNames: ["LightDust Studio", "光塵影像", "LightDust"],
    // 首頁 <title>：「網站名稱｜這句」，讓搜尋結果一眼看出在做什麼
    homeTagline: "商業攝影・影片製作・平面設計",
    // 服務地區：後台網站設定的 serviceAreas 有填就用後台的；兩邊都空時結構化資料不標地區
    serviceAreas: ["台中市"],
    services: ["商業攝影", "美食攝影", "空間攝影", "人像攝影", "婚禮紀錄", "影片製作", "形象影片", "短影音", "平面設計", "整合行銷"],
    serviceCatalogName: "攝影、影片與設計服務",
    // 影片作品從 YouTube 自動帶入時，SEO 描述的前綴
    videoDescriptionPrefix: "光塵影像工作室製作："
};
