/**
 * 從文件系統導入作品項目到 Firebase CMS
 *
 * 使用方法：
 * node scripts/import-portfolio-items.js /path/to/portfolio
 *
 * 例如：
 * node scripts/import-portfolio-items.js "/Users/josephwu/Desktop/bluedot_web/平面"
 */

require("dotenv").config();

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

// 直接從環境變數構建 serviceAccount
const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
};

if (!serviceAccount.project_id) {
    console.error("❌ 錯誤：Firebase 環境變數未設置");
    process.exit(1);
}

initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    projectId: serviceAccount.project_id
});

const db = getFirestore();
const bucket = getStorage().bucket();

// 圖片配置
const IMAGE_CONFIG = {
    maxDimension: 2048,
    dpi: 72,
    outputFormat: 'jpeg',
    jpegQuality: 90
};

// 分類對應
const CATEGORY_MAP = {
    "人像拍攝": "portrait-branding",
    "食物攝影": "commercial-food"
};

async function processAndUploadImage(filePath, fileName) {

    try {

        // 讀取圖片
        const imageBuffer = fs.readFileSync(filePath);

        // 使用 Sharp 處理圖片
        let pipeline = sharp(imageBuffer);
        const metadata = await pipeline.metadata();

        const maxDim = IMAGE_CONFIG.maxDimension;
        const width = metadata.width || 0;
        const height = metadata.height || 0;

        let resizeWidth = width;
        let resizeHeight = height;

        if (width > maxDim || height > maxDim) {
            if (width >= height) {
                resizeWidth = maxDim;
                resizeHeight = Math.round((maxDim / width) * height);
            } else {
                resizeHeight = maxDim;
                resizeWidth = Math.round((maxDim / height) * width);
            }
        }

        // 處理圖片
        const processedBuffer = await sharp(imageBuffer)
            .resize(resizeWidth, resizeHeight, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .toColorspace('srgb')
            .withMetadata({
                density: IMAGE_CONFIG.dpi
            })
            .jpeg({
                quality: IMAGE_CONFIG.jpegQuality,
                progressive: true,
                mozjpeg: true
            })
            .toBuffer();

        // 生成唯一的存儲路徑
        const timestamp = Date.now();
        const storagePath = `portfolio/${timestamp}-${fileName}`;

        // 上傳到 Firebase Storage
        const file = bucket.file(storagePath);
        await file.save(processedBuffer, {
            metadata: {
                contentType: 'image/jpeg',
                metadata: {
                    originalWidth: width,
                    originalHeight: height,
                    processedWidth: resizeWidth,
                    processedHeight: resizeHeight
                }
            }
        });

        // 獲取下載 URL（設置為公開可讀，避免簽名 URL 過期問題）
        await file.makePublic();

        // 構造公開 URL
        const bucketName = bucket.name;
        const url = `https://storage.googleapis.com/${bucketName}/${storagePath}`;

        return {
            url,
            path: storagePath,
            size: processedBuffer.length,
            metadata: {
                originalWidth: width,
                originalHeight: height,
                processedWidth: resizeWidth,
                processedHeight: resizeHeight,
                dpi: IMAGE_CONFIG.dpi,
                colorSpace: 'srgb',
                format: 'jpeg'
            }
        };

    } catch (error) {

        console.error(`❌ 圖片處理失敗: ${fileName}`, error.message);
        return null;

    }

}

async function getImageFiles(dirPath) {

    const files = [];

    try {

        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {

            const fullPath = path.join(dirPath, entry.name);

            if (entry.isFile() && /\.(jpg|jpeg|png|webp)$/i.test(entry.name)) {
                files.push(fullPath);
            }

        }

    } catch (error) {

        console.error(`❌ 無法讀取目錄: ${dirPath}`, error.message);

    }

    return files;

}

async function createOrGetCategory(tenantId, pageId, categoryName) {

    const categoryId = CATEGORY_MAP[categoryName] || categoryName.toLowerCase().replace(/\s+/g, '-');

    // 檢查分類是否已存在
    const snapshot = await db
        .collection("tenants").doc(tenantId)
        .collection("pageCategories")
        .where("pageId", "==", pageId)
        .where("label", "==", categoryName)
        .limit(1)
        .get();

    if (!snapshot.empty) {
        return snapshot.docs[0].id;
    }

    // 創建新分類
    const categoryData = {
        pageId,
        label: categoryName,
        sortOrder: 50,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const docRef = await db
        .collection("tenants").doc(tenantId)
        .collection("pageCategories")
        .add(categoryData);

    return docRef.id;

}

async function importPortfolioItems(portfolioPath) {

    const tenantId = process.env.DEFAULT_TENANT_ID || "default";
    const pageSlug = "photography-services";

    console.log("🚀 開始導入作品...");
    console.log("   路徑:", portfolioPath);
    console.log("   租戶ID:", tenantId);

    try {

        // 1. 獲取或創建頁面
        console.log("\n📄 步驟 1：檢查「攝影服務」頁面...");

        const pagesRef = db.collection("tenants").doc(tenantId).collection("customPages");
        const pageSnapshot = await pagesRef.where("slug", "==", pageSlug).limit(1).get();

        let pageId;

        if (!pageSnapshot.empty) {
            pageId = pageSnapshot.docs[0].id;
            console.log("   ✅ 頁面已存在，ID:", pageId);
        } else {
            console.log("   ⚠️  頁面不存在，請先運行: node scripts/init-photography-services.js");
            return;
        }

        // 2. 遍歷頂級目錄（分類）
        console.log("\n📚 步驟 2：掃描作品分類...");

        const categories = fs.readdirSync(portfolioPath, { withFileTypes: true })
            .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
            .map(entry => entry.name);

        console.log(`   找到 ${categories.length} 個分類`);

        let totalItems = 0;
        let successCount = 0;
        let failureCount = 0;

        for (const categoryName of categories) {

            console.log(`\n   📂 分類: ${categoryName}`);

            const categoryPath = path.join(portfolioPath, categoryName);
            const categoryId = await createOrGetCategory(tenantId, pageId, categoryName);

            // 遍歷分類下的項目目錄
            const projectDirs = fs.readdirSync(categoryPath, { withFileTypes: true })
                .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
                .map(entry => entry.name);

            console.log(`      找到 ${projectDirs.length} 個項目`);

            for (const projectDir of projectDirs) {

                const projectPath = path.join(categoryPath, projectDir);
                const imageFiles = await getImageFiles(projectPath);

                if (imageFiles.length === 0) {
                    console.log(`      ⏭️  ${projectDir} (無圖片)`);
                    continue;
                }

                console.log(`      📸 ${projectDir} (${imageFiles.length} 張圖片)`);

                totalItems++;

                try {

                    // 處理第一張圖片作為封面
                    const coverImagePath = imageFiles[0];
                    const coverFileName = path.basename(coverImagePath);

                    const coverImageData = await processAndUploadImage(coverImagePath, coverFileName);

                    if (!coverImageData) {
                        console.log(`         ❌ 封面圖片處理失敗`);
                        failureCount++;
                        continue;
                    }

                    // 處理其他圖片
                    const galleryImages = [];

                    for (let i = 0; i < imageFiles.length; i++) {

                        const imagePath = imageFiles[i];
                        const imageName = path.basename(imagePath);
                        const processedImage = await processAndUploadImage(imagePath, imageName);

                        if (processedImage) {
                            galleryImages.push({
                                url: processedImage.url,
                                type: 'image',
                                alt: projectDir
                            });
                        }

                    }

                    // 創建項目
                    // 資料夾名稱大多是純中文，去除非 ASCII 字元後常常變成空字串，或是只剩下年份數字（例如
                    // 「2025人像創作合作拍攝（頂威）」「2025人像創作合作拍攝(小裕）」都會變成同一個 "2025"）。
                    // 這種 slug 相撞時 getItemBySlug 只會回傳其中一筆，另一筆的作品詳情頁連結實際上打不開，
                    // 所以固定加上一段用完整資料夾名稱算出來的短 hash 確保唯一
                    const asciiPart = projectDir
                        .toLowerCase()
                        .replace(/\s+/g, '-')
                        .replace(/[^\w-]/g, '')
                        .replace(/^-+|-+$/g, '');
                    const shortHash = require('crypto').createHash('md5').update(projectDir).digest('hex').slice(0, 6);
                    const itemSlug = asciiPart ? `${asciiPart}-${shortHash}` : shortHash;

                    const itemData = {
                        pageId,
                        category: categoryId,
                        title: projectDir,
                        slug: itemSlug,
                        description: `${projectDir}\n\n精選攝影作品集，共 ${galleryImages.length} 張圖片。`,
                        coverImage: {
                            url: coverImageData.url,
                            type: 'image',
                            alt: projectDir
                        },
                        images: galleryImages,
                        published: false, // 預設不發佈，需要在 CMS 手動啟用
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };

                    const itemsRef = db.collection("tenants").doc(tenantId).collection("pageItems");
                    await itemsRef.add(itemData);

                    console.log(`         ✅ 項目創建成功`);
                    successCount++;

                } catch (error) {

                    console.log(`         ❌ 項目創建失敗:`, error.message);
                    failureCount++;

                }

            }

        }

        // 3. 完成報告
        console.log("\n✨ 導入完成！");
        console.log(`   📊 統計：${totalItems} 個項目, 成功 ${successCount} 個, 失敗 ${failureCount} 個`);
        console.log("\n接下來的步驟：");
        console.log("1. 登入 CMS：https://bluedot-slaj.onrender.com/cms");
        console.log("2. 進入「自訂頁面」→「攝影服務」");
        console.log("3. 查看導入的項目並編輯");
        console.log("4. 完成後在頁面設置中啟用「發佈」");

    } catch (error) {

        console.error("\n❌ 導入失敗:");
        console.error(error.message);

    } finally {

        process.exit(0);

    }

}

// 獲取命令行參數
const portfolioPath = process.argv[2];

if (!portfolioPath) {
    console.error("❌ 錯誤：請提供作品集路徑");
    console.error("   用法：node scripts/import-portfolio-items.js /path/to/portfolio");
    process.exit(1);
}

if (!fs.existsSync(portfolioPath)) {
    console.error("❌ 錯誤：路徑不存在:", portfolioPath);
    process.exit(1);
}

// 執行導入
importPortfolioItems(portfolioPath);
