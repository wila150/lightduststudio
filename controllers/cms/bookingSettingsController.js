const bookingSettingsService = require("../../services/bookingSettingsService");
const settingsView = require("../../views/cms/bookingSettings");

// 顯示預約設定
exports.edit = async (req, res) => {

    const settings = await bookingSettingsService.get(req.tenantId);

    res.send(settingsView(settings));

};

// 儲存預約設定
exports.update = async (req, res) => {

    const workDays = Array.isArray(req.body.workDays)
        ? req.body.workDays.map(Number)
        : (req.body.workDays ? [Number(req.body.workDays)] : []);

    await bookingSettingsService.update(req.tenantId, {
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        workDays,
        slotInterval: req.body.slotInterval
    });

    res.redirect("/cms/booking-settings");

};
