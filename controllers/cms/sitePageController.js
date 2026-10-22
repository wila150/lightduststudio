const pageService = require("../../services/pageService");
const sitePageFormView = require("../../views/cms/sitePageForm");
const { dataFromBody } = require("../../services/moduleTypes");

// 產生首頁/關於我/聯絡我共用的一組 CMS handler，pageId 是 "home"/"about"/"contact"
module.exports.createHandlers = (pageId) => {

    const basePath = `/cms/${pageId === "home" ? "pages" : pageId}`;

    return {

        // 顯示編輯頁
        edit: async (req, res) => {

            const page = await pageService.getPage(req.tenantId, pageId);

            res.send(sitePageFormView(pageId, page, basePath));

        },

        // 儲存頁面基本資料（首頁才有 heroTitle 等欄位）
        update: async (req, res) => {

            const data = { updatedAt: new Date() };

            if (pageId === "home") {
                data.heroTitle = req.body.heroTitle;
                data.heroSubtitle = req.body.heroSubtitle;
                data.buttonText = req.body.buttonText;
                data.buttonLink = req.body.buttonLink;
                data.heroShowLogo = req.body.heroShowLogo === "on";
                data.heroLogoSize = parseInt(req.body.heroLogoSize, 10) || 220;
                data.heroLogoSizeMobile = parseInt(req.body.heroLogoSizeMobile, 10) || data.heroLogoSize;
                data.heroShowTitle = req.body.heroShowTitle === "on";
                data.heroShowSubtitle = req.body.heroShowSubtitle === "on";
                data.heroShowButton = req.body.heroShowButton === "on";
                data.removeHeroVideo = req.body.removeHeroVideo === "on";
                data.removeHeroImage = req.body.removeHeroImage === "on";
                data.heroVideoUrl = req.body.heroVideoUrl;
                data.heroImageMediaUrl = req.body.heroImageMediaUrl;
                data.removeHeroLogo = req.body.removeHeroLogo === "on";
                data.heroLogoMediaUrl = req.body.heroLogoMediaUrl;
                data.showFeaturedWorks = req.body.showFeaturedWorks === "on";
                data.heroStyle = req.body.heroStyle === "slideshow" ? "slideshow" : "classic";
                data.button2Text = (req.body.button2Text || "").trim();
                data.button2Link = (req.body.button2Link || "").trim();
                if (req.body.heroSlidesJson !== undefined) try {
                    const slides = JSON.parse(req.body.heroSlidesJson || "[]");
                    data.heroSlides = (Array.isArray(slides) ? slides : []).slice(0, 10).map(slide => ({
                        id: String(slide.id || Date.now() + Math.random()),
                        image: String(slide.image || ""),
                        video: String(slide.video || "").trim(),
                        eyebrow: String(slide.eyebrow || "").trim(),
                        title: String(slide.title || "").trim(),
                        subtitle: String(slide.subtitle || "").trim()
                    })).filter(slide => slide.image || slide.video);
                } catch (error) {
                    // 格式壞掉就不動原本的輪播
                }
            }

            const success = await pageService.updatePage(req.tenantId, pageId, data, req.files);

            if (!success) {
                return res.status(500).send("更新失敗");
            }

            res.redirect(basePath);

        },

        // 新增模組
        addModule: async (req, res) => {

            try {

                await pageService.addModule(req.tenantId, pageId, req.body.type);
                res.redirect(basePath);

            } catch (error) {

                console.error(error);
                res.status(500).send("新增失敗");

            }

        },

        // 更新模組內容
        updateModule: async (req, res) => {

            try {

                const data = await dataFromBody(req.body.type, req.body, req.tenantId);

                await pageService.updateModule(req.tenantId, pageId, req.params.moduleId, data, req.body.moduleBackground, req.body.moduleBackgroundColor);
                res.redirect(basePath);

            } catch (error) {

                console.error(error);
                res.status(500).send("更新失敗");

            }

        },

        // 刪除模組
        removeModule: async (req, res) => {

            try {

                await pageService.removeModule(req.tenantId, pageId, req.params.moduleId);
                res.redirect(basePath);

            } catch (error) {

                console.error(error);
                res.status(500).send("刪除失敗");

            }

        },

        // 上移/下移模組
        moveModule: async (req, res) => {

            try {

                await pageService.moveModule(req.tenantId, pageId, req.params.moduleId, req.body.direction);
                res.redirect(basePath);

            } catch (error) {

                console.error(error);
                res.status(500).send("移動失敗");

            }

        },

        // 拖拉排序（JS fetch 呼叫，回 JSON 不是導轉頁面）
        reorderModules: async (req, res) => {

            const ids = Array.isArray(req.body.ids) ? req.body.ids : [];

            try {

                await pageService.reorderModules(req.tenantId, pageId, ids);
                res.json({ success: true });

            } catch (error) {

                console.error(error);
                res.status(500).json({ success: false });

            }

        }

    };

};
