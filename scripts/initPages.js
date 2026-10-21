require("dotenv").config();
const { db } = require("../config/firebase");

async function initPages() {

    try {

        const pageRef = db.collection("pages").doc("home");

        const doc = await pageRef.get();

        if (doc.exists) {

            console.log("✅ Home Page 已存在");
            process.exit();

        }

        await pageRef.set({

            heroTitle: "歡迎來到我的攝影世界",

            heroSubtitle: "用影像記錄每一個重要時刻",

            buttonText: "立即預約",

            createdAt: new Date(),

            updatedAt: new Date()

        });

        console.log("✅ Home Page 建立成功！");

        process.exit();

    } catch (err) {

        console.error(err);

        process.exit();

    }

}

initPages();