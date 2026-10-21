const bookingService = require("../../services/bookingService");
const serviceItemService = require("../../services/serviceItemService");
const staffService = require("../../services/staffService");
const bookingsView = require("../../views/cms/bookings");
const bookingFormView = require("../../views/cms/bookingForm");

// 預約列表
exports.index = async (req, res) => {

    const bookings = await bookingService.list(req.tenantId);

    res.send(bookingsView(bookings));

};

// 新增預約表單（後台手動登記，例如電話/現場預約）
exports.newForm = async (req, res) => {

    const [services, staff] = await Promise.all([
        serviceItemService.getActive(req.tenantId),
        staffService.getActive(req.tenantId)
    ]);

    res.send(bookingFormView(services, staff));

};

// 新增預約（走跟前台一樣的時段檢查邏輯）
exports.create = async (req, res) => {

    const { serviceId, staffId, date, startTime, customerName, customerEmail, customerPhone, note } = req.body;

    if (!serviceId || !staffId || !date || !startTime || !customerName || !customerEmail) {
        return res.status(400).json({ success: false, message: "缺少必要欄位" });
    }

    const result = await bookingService.create(req.tenantId, {
        serviceId, staffId, date, startTime, customerName, customerEmail, customerPhone, note
    });

    res.json(result);

};

// 取消預約
exports.cancel = async (req, res) => {

    await bookingService.cancel(req.tenantId, req.params.id);

    res.redirect("/cms/bookings");

};

// 改期
exports.reschedule = async (req, res) => {

    const { date, startTime } = req.body;

    if (!date || !startTime) {
        return res.status(400).json({ success: false, message: "缺少日期或時段" });
    }

    const result = await bookingService.reschedule(req.tenantId, req.params.id, date, startTime);

    res.json(result);

};

// 刪除單筆預約紀錄（僅供刪除已取消的預約，保留確認中的紀錄避免誤刪）
exports.remove = async (req, res) => {

    await bookingService.remove(req.tenantId, req.params.id);

    res.redirect("/cms/bookings");

};

// 批次刪除
exports.removeMany = async (req, res) => {

    const ids = Array.isArray(req.body.ids) ? req.body.ids : (req.body.ids ? [req.body.ids] : []);

    if (ids.length > 0) {
        await bookingService.removeMany(req.tenantId, ids);
    }

    res.redirect("/cms/bookings");

};
