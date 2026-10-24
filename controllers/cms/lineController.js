const lineBotService = require("../../services/lineBotService");
const storageService = require("../../services/storageService");
const { fixUploadName } = require("../../config/uploadLimits");
const lineView = require("../../views/cms/line");

exports.index = async (req, res) => {

    const bindCode = await lineBotService.ensureBindCode(req.tenantId);
    const [config, quota, defaultRichMenuId, settings] = await Promise.all([
        lineBotService.getConfig(req.tenantId),
        lineBotService.quota(req.tenantId),
        lineBotService.currentDefaultRichMenu(req.tenantId),
        require("../../services/settingsService").get(req.tenantId)
    ]);

    res.send(lineView(config, { quota, defaultRichMenuId, bindCode, notifyCount: (settings.lineNotifyUserIds || []).length }, req.session.user));

};

// 歡迎詞＋關鍵字（前端整包 JSON 送來）
exports.saveReplies = async (req, res) => {

    const welcome = req.body.welcome || {};
    const keywords = (Array.isArray(req.body.keywords) ? req.body.keywords : [])
        .map(rule => ({
            id: String(rule.id || lineBotService.newId()),
            enabled: rule.enabled !== false,
            words: String(rule.words || "").split(/[、,，\n]/).map(w => w.trim()).filter(Boolean).slice(0, 20),
            match: rule.match === "contains" ? "contains" : "exact",
            text: String(rule.text || "").slice(0, 4900)
        }))
        .filter(rule => rule.words.length && rule.text);

    const inquiry = req.body.inquiry || {};
    const list = value => String(value || "").split(/[、,，\n]/).map(w => w.trim()).filter(Boolean);
    const ask = value => String(value || "").slice(0, 2000);

    await lineBotService.saveConfig(req.tenantId, {
        welcome: { enabled: welcome.enabled !== false, text: String(welcome.text || "").slice(0, 4900) },
        keywords,
        inquiry: {
            enabled: inquiry.enabled !== false,
            triggers: list(inquiry.triggers).slice(0, 20),
            // 快速按鈕 LINE 最多 13 個（要留一個給「取消」），每個最多 20 字
            services: list(inquiry.services).map(s => s.slice(0, 20)).slice(0, 12),
            askService: ask(inquiry.askService),
            askDate: ask(inquiry.askDate),
            askPhone: ask(inquiry.askPhone),
            askNote: ask(inquiry.askNote),
            done: ask(inquiry.done)
        }
    });

    res.json({ success: true, count: keywords.length });

};

exports.publishRichMenu = async (req, res) => {

    try {

        const config = await lineBotService.getConfig(req.tenantId);
        const layout = req.body.layout;
        const areas = JSON.parse(req.body.areas || "[]");
        const chatBarText = (req.body.chatBarText || "選單").trim();

        let source = req.file && req.file.buffer;
        if (!source && config.richMenu.imageUrl) {
            source = Buffer.from(await (await fetch(config.richMenu.imageUrl)).arrayBuffer());
        }
        if (!source) {
            return res.status(400).json({ error: "請上傳圖文選單圖片" });
        }

        const imageBuffer = await lineBotService.prepareRichMenuImage(source, layout);
        const richMenuId = await lineBotService.publishRichMenu(req.tenantId, { layout, areas, chatBarText, imageBuffer });

        let imageUrl = config.richMenu.imageUrl;
        if (req.file || layout !== config.richMenu.layout) {
            imageUrl = (await storageService.uploadBuffer(imageBuffer, "line-rich-menu.jpg", "image/jpeg", "line", { processed: true })).url;
        }

        await lineBotService.saveConfig(req.tenantId, {
            richMenu: { layout, areas, chatBarText, imageUrl, richMenuId, publishedAt: new Date() }
        });

        res.json({ success: true, imageUrl, richMenuId });

    } catch (error) {

        console.error(error);
        res.status(400).json({ error: error.message || "發佈失敗" });

    }

};

// 推播圖片走統一照片規格（長邊 2048、JPG），Flex 圖片也需要長寬比
exports.uploadBroadcastImage = async (req, res) => {

    try {

        if (!req.file) return res.status(400).json({ error: "沒有收到圖片" });

        const uploaded = await storageService.uploadBuffer(req.file.buffer, fixUploadName(req.file.originalname), req.file.mimetype, "line");
        const meta = await require("sharp")(req.file.buffer).rotate().metadata();
        const rotated = (meta.orientation || 1) >= 5;
        const width = rotated ? meta.height : meta.width;
        const height = rotated ? meta.width : meta.height;

        res.json({ imageUrl: uploaded.url, imageRatio: lineBotService.imageRatio(width, height), tooTall: height > width * 3 });

    } catch (error) {

        console.error(error);
        res.status(400).json({ error: error.message || "上傳失敗" });

    }

};

// action：save 只儲存、test 傳給自己、send 推播給所有好友
exports.broadcast = async (req, res) => {

    const body = req.body || {};
    const broadcast = {
        imageUrl: String(body.imageUrl || ""),
        imageRatio: /^\d+:\d+$/.test(body.imageRatio || "") ? body.imageRatio : "1:1",
        action: ["message", "uri", "none"].includes(body.tapAction) ? body.tapAction : "none",
        actionValue: String(body.actionValue || "").slice(0, 1000),
        altText: String(body.altText || "").slice(0, 400),
        text: String(body.text || "").slice(0, 4900)
    };

    try {

        await lineBotService.saveConfig(req.tenantId, { broadcast });

        if (body.action === "test") {
            const count = await lineBotService.sendTest(req.tenantId, broadcast);
            return res.json({ success: true, message: `已傳給 ${count} 個測試帳號` });
        }

        if (body.action === "send") {
            await lineBotService.sendBroadcast(req.tenantId, broadcast);
            await lineBotService.saveConfig(req.tenantId, { lastBroadcastAt: new Date() });
            return res.json({ success: true, message: "已推播給所有好友" });
        }

        res.json({ success: true, message: "已儲存" });

    } catch (error) {

        console.error(error);
        res.status(400).json({ error: error.message || "發送失敗" });

    }

};
