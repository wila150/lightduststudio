const crypto = require("crypto");
const { tenantCollection } = require("../config/firebase");
const storageService = require("./storageService");
const moduleService = require("./moduleService");

function seedModules(entries) {
    return entries.map(([type, data]) => ({ id: crypto.randomUUID(), type, data }));
}

const DEFAULT_FIELDS = {

    home: {
        heroTitle: "",
        heroSubtitle: "",
        buttonText: "",
        buttonLink: "",
        heroShowLogo: false,
        heroLogoSize: 220,
        heroLogoSizeMobile: 220,
        heroLogo: "",
        heroLogoPath: "",
        heroShowTitle: true,
        heroShowSubtitle: true,
        heroShowButton: true,
        heroImage: "",
        heroImagePath: "",
        heroVideo: "",
        heroVideoPath: "",
        showFeaturedWorks: true
    },

    about: {},

    contact: {}

};

// 頁面第一次被讀取時（Firestore 裡還沒有這份文件）拿來建立初始內容，避免網站在你還沒進 CMS 設定前顯示空白
const DEFAULT_MODULE_SEEDS = {

    home: [
        ["featureCard", { title: "攝影作品", description: "分享生活、人像、風景等攝影作品，記錄每一個精彩瞬間。" }],
        ["featureCard", { title: "網站開發", description: "使用 HTML、CSS、JavaScript、Node.js、Express 與 Firebase 建立完整網站。" }],
        ["featureCard", { title: "持續學習", description: "不斷學習新的技術，提升自己的前端與後端開發能力。" }]
    ],

    about: [
        ["text", { html: "<p>你好，我是一位熱愛程式設計與網站開發的學生，喜歡透過程式設計解決問題，也持續學習新的技術與工具。</p>" }],
        ["timelineItem", { year: "現在", text: "持續學習 Node.js、Express、Firebase，並開發個人作品集網站。" }],
        ["timelineItem", { year: "技能", text: "熟悉 HTML、CSS、JavaScript，能建立前後端整合的網站。" }],
        ["timelineItem", { year: "目標", text: "希望透過這個網站展示自己的作品與學習成果，並持續累積開發經驗。" }]
    ],

    contact: [
        ["contactForm", {}],
        ["heading", { text: "其他聯絡方式", level: "2" }],
        ["text", { html: "<p><strong>Email：</strong>your@email.com</p><p><strong>GitHub：</strong>https://github.com/yourname</p><p><strong>LinkedIn：</strong>https://linkedin.com/in/yourname</p>" }]
    ]

};

class PageService {

    docRef(tenantId, pageId) {
        return tenantCollection(tenantId, "pages").doc(pageId);
    }

    async getPage(tenantId, pageId) {

        try {

            const ref = this.docRef(tenantId, pageId);
            const doc = await ref.get();

            if (!doc.exists) {

                const seeded = {
                    ...(DEFAULT_FIELDS[pageId] || {}),
                    modules: seedModules(DEFAULT_MODULE_SEEDS[pageId] || []),
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                await ref.set(seeded);

                return seeded;

            }

            return { modules: [], ...doc.data() };

        } catch (error) {

            console.error(error);

            return null;

        }

    }

    // files 只有 pageId === "home" 才會用到（首頁主圖/主影片），格式比照 multer .fields() 的輸出：{ heroImage: [file], heroVideo: [file] }
    async updatePage(tenantId, pageId, data, files = {}) {

        try {

            const imageFile = files.heroImage && files.heroImage[0];
            const videoFile = files.heroVideo && files.heroVideo[0];
            const logoFile = files.heroLogo && files.heroLogo[0];
            const videoUrl = (data.heroVideoUrl || "").trim();

            if (imageFile || videoFile || logoFile || videoUrl || data.removeHeroVideo || data.removeHeroImage || data.removeHeroLogo || data.heroImageMediaUrl || data.heroLogoMediaUrl) {

                const existing = await this.getPage(tenantId, pageId);

                if (imageFile) {

                    if (existing && existing.heroImagePath) {
                        await storageService.deleteFile(existing.heroImagePath);
                    }

                    const uploaded = await storageService.uploadBuffer(imageFile.buffer, imageFile.originalname, imageFile.mimetype, "pages");

                    data.heroImage = uploaded.url;
                    data.heroImagePath = uploaded.path;

                } else if (data.heroImageMediaUrl) {

                    // 直接沿用媒體庫裡現成的檔案，不重新上傳一份，所以不記錄 path——
                    // 避免之後移除首頁主圖時，把媒體庫裡其他地方可能還在用的這個檔案也刪掉
                    if (existing && existing.heroImagePath) {
                        await storageService.deleteFile(existing.heroImagePath);
                    }

                    data.heroImage = data.heroImageMediaUrl;
                    data.heroImagePath = "";

                } else if (data.removeHeroImage && existing && existing.heroImagePath) {

                    await storageService.deleteFile(existing.heroImagePath);
                    data.heroImage = "";
                    data.heroImagePath = "";

                }

                // 首頁影片/主圖上方置中顯示的 Logo，跟導覽列 Logo（網站設定裡的 logoUrl）分開，各自能上傳不同圖片
                if (logoFile) {

                    if (existing && existing.heroLogoPath) {
                        await storageService.deleteFile(existing.heroLogoPath);
                    }

                    const uploaded = await storageService.uploadBuffer(logoFile.buffer, logoFile.originalname, logoFile.mimetype, "pages");

                    data.heroLogo = uploaded.url;
                    data.heroLogoPath = uploaded.path;

                } else if (data.heroLogoMediaUrl) {

                    if (existing && existing.heroLogoPath) {
                        await storageService.deleteFile(existing.heroLogoPath);
                    }

                    data.heroLogo = data.heroLogoMediaUrl;
                    data.heroLogoPath = "";

                } else if (data.removeHeroLogo && existing && existing.heroLogoPath) {

                    await storageService.deleteFile(existing.heroLogoPath);
                    data.heroLogo = "";
                    data.heroLogoPath = "";

                }

                if (videoFile) {

                    // 新上傳檔案優先，舊的（不管是上傳檔案還是外部連結）都要清掉
                    if (existing && existing.heroVideoPath) {
                        await storageService.deleteFile(existing.heroVideoPath);
                    }

                    const uploaded = await storageService.uploadBuffer(videoFile.buffer, videoFile.originalname, videoFile.mimetype, "pages");

                    data.heroVideo = uploaded.url;
                    data.heroVideoPath = uploaded.path;

                } else if (data.removeHeroVideo) {

                    if (existing && existing.heroVideoPath) {
                        await storageService.deleteFile(existing.heroVideoPath);
                    }

                    data.heroVideo = "";
                    data.heroVideoPath = "";

                } else if (videoUrl && videoUrl !== (existing && existing.heroVideo)) {

                    // 用外部連結取代目前的影片：不佔用 Storage 空間，舊的上傳檔案（如果有）要清掉
                    if (existing && existing.heroVideoPath) {
                        await storageService.deleteFile(existing.heroVideoPath);
                    }

                    data.heroVideo = videoUrl;
                    data.heroVideoPath = "";

                }

            }

            delete data.removeHeroVideo;
            delete data.removeHeroImage;
            delete data.removeHeroLogo;
            delete data.heroVideoUrl;
            delete data.heroImageMediaUrl;
            delete data.heroLogoMediaUrl;

            await this.docRef(tenantId, pageId).set(data, { merge: true });

            return true;

        } catch (error) {

            console.error(error);

            return false;

        }

    }

    async addModule(tenantId, pageId, type) {
        return moduleService.addModule(this.docRef(tenantId, pageId), type);
    }

    async updateModule(tenantId, pageId, moduleId, data, background, backgroundColor) {
        return moduleService.updateModule(this.docRef(tenantId, pageId), moduleId, data, background, backgroundColor);
    }

    async removeModule(tenantId, pageId, moduleId) {
        return moduleService.removeModule(this.docRef(tenantId, pageId), moduleId);
    }

    async moveModule(tenantId, pageId, moduleId, direction) {
        return moduleService.moveModule(this.docRef(tenantId, pageId), moduleId, direction);
    }

    async reorderModules(tenantId, pageId, orderedIds) {
        return moduleService.reorderModules(this.docRef(tenantId, pageId), orderedIds);
    }

}

module.exports = new PageService();
