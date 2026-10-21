const { tenantCollection } = require("../config/firebase");
const serviceItemService = require("./serviceItemService");
const staffService = require("./staffService");
const bookingSettingsService = require("./bookingSettingsService");

function timeToMinutes(time) {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
}

function minutesToTime(minutes) {
    const h = String(Math.floor(minutes / 60)).padStart(2, "0");
    const m = String(minutes % 60).padStart(2, "0");
    return `${h}:${m}`;
}

function todayString() {
    return new Date().toISOString().slice(0, 10);
}

function nowMinutes() {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
}

class BookingService {

    async getConfirmedBookings(tenantId, staffId, date) {

        try {

            const snapshot = await tenantCollection(tenantId, "bookings")
                .where("staffId", "==", staffId)
                .where("date", "==", date)
                .where("status", "==", "confirmed")
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        } catch (error) {

            console.error(error);

            return [];

        }

    }

    async getAvailableSlots(tenantId, serviceId, staffId, date) {

        const service = await serviceItemService.getById(tenantId, serviceId);

        if (!service) {
            return [];
        }

        const settings = await bookingSettingsService.get(tenantId);

        const dayOfWeek = new Date(`${date}T00:00:00`).getDay();

        if (!settings.workDays.includes(dayOfWeek)) {
            return [];
        }

        const existing = await this.getConfirmedBookings(tenantId, staffId, date);

        const startBound = timeToMinutes(settings.startTime);
        const endBound = timeToMinutes(settings.endTime);
        const isToday = date === todayString();
        const currentMinutes = nowMinutes();

        const slots = [];

        for (let start = startBound; start + service.duration <= endBound; start += settings.slotInterval) {

            const end = start + service.duration;

            if (isToday && start <= currentMinutes) {
                continue;
            }

            const conflict = existing.some(booking => {
                const bStart = timeToMinutes(booking.startTime);
                const bEnd = timeToMinutes(booking.endTime);
                return bStart < end && bEnd > start;
            });

            if (conflict) {
                continue;
            }

            slots.push({ startTime: minutesToTime(start), endTime: minutesToTime(end) });

        }

        return slots;

    }

    async create(tenantId, data) {

        const service = await serviceItemService.getById(tenantId, data.serviceId);
        const staff = await staffService.getById(tenantId, data.staffId);

        if (!service || !staff) {
            return { success: false, message: "找不到服務或人員" };
        }

        const availableSlots = await this.getAvailableSlots(tenantId, data.serviceId, data.staffId, data.date);
        const slot = availableSlots.find(s => s.startTime === data.startTime);

        if (!slot) {
            return { success: false, message: "這個時段已經被預約或已過期，請重新選擇" };
        }

        const booking = {
            serviceId: data.serviceId,
            serviceName: service.name,
            staffId: data.staffId,
            staffName: staff.name,
            date: data.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            customerName: data.customerName,
            customerEmail: data.customerEmail,
            customerPhone: data.customerPhone || "",
            note: data.note || "",
            status: "confirmed",
            createdAt: new Date()
        };

        const ref = await tenantCollection(tenantId, "bookings").add(booking);

        return { success: true, booking: { id: ref.id, ...booking } };

    }

    async list(tenantId) {

        try {

            const snapshot = await tenantCollection(tenantId, "bookings").orderBy("createdAt", "desc").get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        } catch (error) {

            console.error(error);

            return [];

        }

    }

    async cancel(tenantId, id) {

        await tenantCollection(tenantId, "bookings").doc(id).update({ status: "cancelled" });

        return true;

    }

    // 徹底刪除一筆預約紀錄（用於清除已取消、不需要保留的舊資料）
    async remove(tenantId, id) {

        await tenantCollection(tenantId, "bookings").doc(id).delete();

        return true;

    }

    // 批次刪除多筆預約紀錄
    async removeMany(tenantId, ids) {

        await Promise.all(ids.map(id => this.remove(tenantId, id)));

        return true;

    }

    // 改期：檢查新時段是否可用（排除自己這筆），可用才更新日期/時間
    async reschedule(tenantId, id, newDate, newStartTime) {

        const doc = await tenantCollection(tenantId, "bookings").doc(id).get();

        if (!doc.exists) {
            return { success: false, message: "找不到這筆預約" };
        }

        const booking = doc.data();

        const availableSlots = await this.getAvailableSlots(tenantId, booking.serviceId, booking.staffId, newDate);
        const slot = availableSlots.find(s => s.startTime === newStartTime);

        if (!slot) {
            return { success: false, message: "這個時段已經被預約或已過期，請重新選擇" };
        }

        await tenantCollection(tenantId, "bookings").doc(id).update({
            date: newDate,
            startTime: slot.startTime,
            endTime: slot.endTime
        });

        return { success: true };

    }

}

module.exports = new BookingService();
