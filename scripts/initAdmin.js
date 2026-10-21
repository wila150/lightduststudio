require("dotenv").config();
const bcrypt = require("bcrypt");
const { db } = require("../config/firebase");

async function initAdmin() {
    try {
        const adminRef = db.collection("admins").doc("admin");

        const doc = await adminRef.get();

        if (doc.exists) {
            console.log("✅ Super Admin 已存在");
            process.exit();
        }

        const hash = await bcrypt.hash("123456", 10);

        await adminRef.set({
            username: "admin",
            password: hash,
            name: "Administrator",
            email: "admin@example.com",
            role: "superadmin",
            status: "active",
            createdAt: new Date()
        });

        console.log("✅ Super Admin 建立成功！");
        console.log("帳號：admin");
        console.log("密碼：123456");

        process.exit();

    } catch (err) {

        console.error(err);

        process.exit();

    }
}

initAdmin();