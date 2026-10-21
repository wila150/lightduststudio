require("dotenv").config();
const bcrypt = require("bcrypt");
const { db } = require("../config/firebase");

// 用法：node scripts/setAdminPassword.js <帳號> <新密碼>
async function setAdminPassword() {

    const [username, password] = process.argv.slice(2);

    if (!username || !password) {
        console.log("用法：node scripts/setAdminPassword.js <帳號> <新密碼>");
        process.exit(1);
    }

    try {

        const ref = db.collection("admins").doc(username);

        const doc = await ref.get();

        const hash = await bcrypt.hash(password, 10);

        if (!doc.exists) {

            await ref.set({
                username,
                password: hash,
                name: username,
                email: "",
                role: "superadmin",
                status: "active",
                createdAt: new Date()
            });

            console.log(`✅ 新帳號 ${username} 建立成功`);

        } else {

            await ref.update({ password: hash });

            console.log(`✅ 帳號 ${username} 密碼已更新`);

        }

        process.exit();

    } catch (err) {

        console.error(err);

        process.exit(1);

    }

}

setAdminPassword();
