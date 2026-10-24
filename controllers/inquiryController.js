const settingsService = require("../services/settingsService");
const messageService = require("../services/messageService");
const lineService = require("../services/lineService");
const featureService = require("../services/featureService");
const inquiryView = require("../views/inquiry");

const DEFAULT_TENANT_ID = "default";

exports.form = (req, res) => {
    res.send(inquiryView.form());
};

exports.submit = async (req, res) => {

    const name = String(req.body.name || "").trim().slice(0, 40);
    const contact = String(req.body.contact || "").trim().slice(0, 60);
    const services = [].concat(req.body.service || []).map(String).filter(s => inquiryView.SERVICES.includes(s));
    const date = /^\d{4}-\d{2}-\d{2}$/.test(req.body.date || "") ? req.body.date : "";
    const note = String(req.body.message || "").trim().slice(0, 1000);
    const settings = await settingsService.get(DEFAULT_TENANT_ID);
    const done = () => res.redirect("/inquiry/done");

    // 蜜罐欄位：機器人才會填，假裝成功但不存
    if (req.body.hp_website) {
        return done();
    }

    if (!name || !contact || !services.length) {
        return res.status(400).send(inquiryView.form({
            values: { name, contact, service: services, date, message: note },
            error: !services.length && name && contact ? "請選擇想詢問的服務" : "請填寫稱呼和聯絡方式，並選擇想詢問的服務"
        }));
    }

    const lines = [
        `聯絡方式：${contact}`,
        `服務：${services.join("、")}`,
        date ? `預計日期：${date}` : "",
        note ? `需求：${note}` : ""
    ].filter(Boolean);

    await messageService.create(DEFAULT_TENANT_ID, {
        name,
        email: "",
        subject: `預約諮詢｜${services.join("、")}`,
        message: lines.join("\n")
    });

    if (featureService.enabled("line")) {
        lineService.notifyOwners(DEFAULT_TENANT_ID, `📅 新的預約諮詢\n姓名：${name}\n${lines.join("\n")}`)
            .catch(error => console.error("LINE notify error:", error));
    }

    done();

};

exports.done = async (req, res) => {
    const settings = await settingsService.get(DEFAULT_TENANT_ID);
    res.send(inquiryView.done({ lineUrl: settings.lineFriendUrl, phone: settings.contactPhone }));
};
