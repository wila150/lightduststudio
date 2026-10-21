/**
 * 拆開被合併的平面作品：Google Drive 下載的原始資料夾裡，同名資料夾其實是不同場次的拍攝
 * （例如「百分之甜抓周派對」有 8 場，各自有一張封面），之前匯入時被併成同一個作品。
 * 這支腳本照原始資料夾把照片分回各場次：原本的作品留給第一個場次（網址不變），其餘場次另外新增作品。
 * 照片沿用已經上傳的檔案，不重新上傳；封面用感知雜湊比對原始資料夾的「封面」檔找出是哪一張。
 *
 * 使用方法：node scripts/split-merged-photo-items.js "/Users/josephwu/Desktop/平面作品" [--dry-run]
 */

require("dotenv").config({ quiet: true });

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");
const { tenantCollection } = require("../config/firebase");
const { DEFAULT_TENANT_ID } = require("../config/tenant");

const ROOT = process.argv[2];
const DRY_RUN = process.argv.includes("--dry-run");
const IMG = /\.(jpe?g|png)$/i;

// 要拆的作品 id → 每個場次的標題（依原始資料夾名稱尾端空白數 0,1,2… 排列，順序見 groupVariants）
const TARGETS = {
    ohKYJIfb4zXfsubk7KJp: { name: "百分之甜抓周派對" },
    G9o0tKwKcjW6ikCj7BVg: { name: "晚安花藝性別揭曉派對" },
    EfrLPOKHYbx6AOzPaIlt: { name: "KOL PAZZO 品牌業配合作" }
};

async function dhash(input) {
    const buf = await sharp(input).rotate().resize(9, 8, { fit: "fill" }).grayscale().raw().toBuffer();
    let bits = "";
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += buf[y * 9 + x] < buf[y * 9 + x + 1] ? "1" : "0";
    return bits;
}

const distance = (a, b) => [...a].filter((bit, i) => bit !== b[i]).length;

// 收集原始資料夾裡同名（去掉尾端空白後相同）的各個場次，每個場次合併 13 個分割下載資料夾裡的檔案
async function groupVariants(name) {

    const variants = new Map();

    for (const part of fs.readdirSync(ROOT).filter(p => p.startsWith("平面-"))) {
        const base = path.join(ROOT, part, "平面");
        for (const cat of fs.readdirSync(base)) {
            const catPath = path.join(base, cat);
            if (!fs.statSync(catPath).isDirectory()) continue;
            for (const dir of fs.readdirSync(catPath)) {
                if (dir.trim() !== name) continue;
                const key = dir.length - dir.trimEnd().length;
                const variant = variants.get(key) || { files: new Set(), coverPath: null };
                for (const file of fs.readdirSync(path.join(catPath, dir))) {
                    if (!IMG.test(file)) continue;
                    if (file.startsWith("封面")) variant.coverPath = variant.coverPath || path.join(catPath, dir, file);
                    else variant.files.add(file);
                }
                variants.set(key, variant);
            }
        }
    }

    return [...variants.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v).filter(v => v.files.size > 0 || v.coverPath);

}

async function fetchHash(url) {
    const res = await fetch(url);
    return dhash(Buffer.from(await res.arrayBuffer()));
}

// 場次的拍攝日期：檔名開頭是日期（20251207_xxx）才抓得到
function variantDate(variant) {
    const dated = [...variant.files].map(f => f.match(/^(20\d{2})(\d{2})(\d{2})_/)).find(Boolean);
    return dated ? `${dated[1]}.${dated[2]}.${dated[3]}` : "";
}

// 標題用日期區分場次；同一天有兩場、或檔名沒有日期的，再加 Part 1／Part 2
function assignTitles(name, plan) {
    plan.forEach(p => {
        const sameDate = plan.filter(other => other.date === p.date);
        const part = !p.date ? ` Part ${plan.indexOf(p) + 1}` : sameDate.length > 1 ? ` Part ${sameDate.indexOf(p) + 1}` : "";
        p.title = `${name}${p.date ? ` ${p.date}` : ""}${part}`;
    });
}

(async () => {

    for (const [itemId, { name }] of Object.entries(TARGETS)) {

        const ref = tenantCollection(DEFAULT_TENANT_ID, "pageItems").doc(itemId);
        const item = (await ref.get()).data();
        const variants = await groupVariants(name);

        if (variants.length < 2) {
            console.log(`⏭  ${name}：只有一個場次，不用拆`);
            continue;
        }

        // 所有候選封面：原本的作品封面＋相簿裡 sourceName 是「封面-N」的照片
        const coverCandidates = [
            { image: item.coverImage, isCurrentCover: true },
            ...item.images.filter(img => /^封面/.test(img.sourceName || "")).map(image => ({ image }))
        ];
        for (const c of coverCandidates) c.hash = await fetchHash(c.image.url);

        const plan = [];

        for (const variant of variants) {

            const coverHash = variant.coverPath ? await dhash(variant.coverPath) : null;
            const cover = coverHash && coverCandidates
                .map(c => ({ c, d: distance(c.hash, coverHash) }))
                .sort((a, b) => a.d - b.d)
                .find(x => x.d <= 8);

            const photos = item.images.filter(img => variant.files.has(img.sourceName));

            plan.push({ date: variantDate(variant), cover: cover ? cover.c.image : null, photos });

        }

        assignTitles(name, plan);

        const coverUrls = plan.map(p => p.cover && p.cover.url).filter(Boolean);
        if (new Set(coverUrls).size !== coverUrls.length) {
            console.error(`❌ ${name}：有兩個場次對到同一張封面，跳過`);
            continue;
        }

        // 第一個場次的照片排在原本相簿最前面，所以原本的作品留給它
        const assigned = new Set(plan.flatMap(p => [...p.photos.map(img => img.id), p.cover && p.cover.id].filter(Boolean)));
        const leftovers = item.images.filter(img => !assigned.has(img.id) && !/^封面/.test(img.sourceName || ""));

        console.log(`\n${name}（原本 ${item.images.length} 張）→ 拆成 ${plan.length} 個作品${leftovers.length ? `，⚠ ${leftovers.length} 張對不到場次，留在第一個作品` : ""}`);
        plan.forEach(p => console.log(`   ${p.title}：${p.photos.length} 張，封面${p.cover ? "✓" : "✗"}`));

        if (DRY_RUN) continue;

        const [first, ...rest] = plan;

        await ref.update({
            title: first.title,
            images: [...first.photos, ...leftovers],
            coverImage: first.cover ? { ...first.cover, type: first.cover.type || "image" } : item.coverImage,
            updatedAt: new Date()
        });

        // 新場次排在原本作品後面，緊接著排；sortOrder 用小數插在原本作品和下一個作品之間
        for (const [i, p] of rest.entries()) {
            const { id, ...copy } = item;
            await tenantCollection(DEFAULT_TENANT_ID, "pageItems").add({
                ...copy,
                title: p.title,
                slug: `${item.slug}-${i + 2}`,
                images: p.photos,
                coverImage: p.cover ? { url: p.cover.url, type: "image", path: p.cover.path || "" } : null,
                modules: [],
                sortOrder: item.sortOrder - (i + 1) / (rest.length + 1),
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }

    }

    process.exit(0);

})();
