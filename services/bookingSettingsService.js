const { tenantCollection } = require("../config/firebase");

const DEFAULTS = {
    startTime: "09:00",
    endTime: "18:00",
    workDays: [1, 2, 3, 4, 5], // 0=週日 ... 6=週六
    slotInterval: 30 // 分鐘
};

class BookingSettingsService {

    docRef(tenantId) {
        return tenantCollection(tenantId, "settings").doc("booking");
    }

    async get(tenantId) {

        try {

            const doc = await this.docRef(tenantId).get();

            if (!doc.exists) {
                return { ...DEFAULTS };
            }

            return { ...DEFAULTS, ...doc.data() };

        } catch (error) {

            console.error(error);

            return { ...DEFAULTS };

        }

    }

    async update(tenantId, data) {

        try {

            await this.docRef(tenantId).set({
                startTime: data.startTime,
                endTime: data.endTime,
                workDays: data.workDays,
                slotInterval: Number(data.slotInterval) || 30
            }, { merge: true });

            return true;

        } catch (error) {

            console.error(error);

            return false;

        }

    }

}

module.exports = new BookingSettingsService();
