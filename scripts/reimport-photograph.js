// 清空 PHOTOGRAPH（平面攝影）的作品與媒體庫照片，再從 Google Drive 下載下來的資料夾整份重新匯入（2026/10/01）
// 用法（在專案根目錄執行）：node scripts/reimport-photograph.js <下載資料夾> <備份 JSON> [run]
//   不帶 run = 只印規劃，不刪除也不上傳
//
// 規則：
// - 每個分類資料夾裡的作品都放進該分類；同一個作品出現在兩個分類資料夾，就兩個分類各放一份
// - Drive 上同名的作品資料夾是不同場次（下載時用「名稱~N」區分），各自成為一個作品，標題用拍攝日期／Part 區分
// - 名稱＋分類跟備份裡的舊作品對得上時，沿用舊的網址、描述、SEO 描述、排序、封面位置，前台連結與排序不會跑掉
// - 媒體庫：保留 LOGO／服務項目／OUR STORY 這些不是作品集的相簿，其他照片與相簿全部刪除，
//   再依「分類 → 作品」建相簿放新照片
// - 首頁作品輪播原本指到的舊作品，依名稱改指到新作品
require("dotenv").config({ quiet: true });
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { tenantCollection } = require("../config/firebase");
const storageService = require("../services/storageService");

const [SRC, BACKUP] = [process.argv[2], process.argv[3]];
const RUN = process.argv[4] === "run";
const T = "default";
const PAGE = "ox87mWDphrW2aGYDUCmR";
const KEEP_ALBUMS = ["合作品牌LOGO", "logo", "服務項目", "OUR STORY"];

// [網站分類名稱, 英文名稱, slug 前綴, Drive 分類資料夾名稱]
const CATS = [
    ["人像拍攝", "Portrait Photography", "portrait", ["人像拍攝"]],
    ["主視覺影像製作", "Key Visual Production", "key-visual", ["主視覺影像製作 Key Visual Production", "主視覺影像製作"]],
    ["形象照/演員卡", "Headshots & Model Cards", "headshot", ["形象照:演員卡", "形象照_演員卡"]],
    ["活動紀錄", "Event Photography", "event", ["活動紀錄"]],
    ["美食攝影", "Food Photography", "food", ["食物攝影", "美食攝影"]],
    ["婚慶/抓周/性別派對", "Weddings & Celebrations", "celebration", ["婚慶:抓周:性別派對", "婚慶_抓周_性別派對"]],
    ["運動攝影", "Sports Photography", "sports", ["運動攝影"]],
    ["劇場/舞台攝影", "Theatre & Stage Photography", "stage", ["劇場:舞台攝影", "劇場_舞台攝影"]]
];

// Drive 資料夾名稱的錯字／不一致，對應回網站上已經修正過的名稱（也才對得到舊作品，沿用網址與排序）
const TITLE_FIX = {
    "KOL AMARNI 阿曼尼品牌業配合作": "KOL ARMANI 阿曼尼品牌業配合作",
    "KOL NewBlance 品牌活動合作": "KOL New Balance 品牌活動合作",
    "KOL lamer海洋拉娜品牌活動合作": "KOL La Mer 海洋拉娜品牌活動合作",
    "台北藝穗節 伊生劇團「超級百雙戲連演」演出劇照": "台北藝穗節 伊生劇團「超擊百雙戲連演」演出劇照",
    "2025 松鶴越野": "2025 松鶴越野賽跑",
    "「舞影」舞蹈競賽拍攝": "「舞影」舞蹈競賽",
    "樂手形象照": "LIVE BAND樂手形象照",
    "微光劇團「主人今天要陪我玩嗎？！」角色視覺": "臺北藝穗節 微光劇團「主人今天要陪我玩嗎？！」角色視覺"
};

const IMG = /\.(jpe?g|png|webp)$/i;
const mime = f => /\.png$/i.test(f) ? "image/png" : /\.webp$/i.test(f) ? "image/webp" : "image/jpeg";
const md5 = f => crypto.createHash("md5").update(fs.readFileSync(f)).digest("hex");
const byName = (a, b) => a.localeCompare(b, "zh-Hant", { numeric: true });
const dirs = p => fs.readdirSync(p).filter(f => fs.statSync(path.join(p, f)).isDirectory());

async function pool(tasks, n) {
    const out = [];
    let i = 0;
    await Promise.all(Array.from({ length: n }, async () => {
        while (i < tasks.length) {
            const k = i++;
            out[k] = await tasks[k]();
        }
    }));
    return out;
}

// 同名場次的標題：檔名開頭有日期（20251207_xxx）就用日期，同一天兩場或沒有日期的加 Part N
function titleVariants(base, variants) {
    variants.forEach(v => {
        const m = v.files.map(f => f.match(/^(20\d{2})(\d{2})(\d{2})_/)).find(Boolean);
        v.date = m ? `${m[1]}.${m[2]}.${m[3]}` : "";
    });
    variants.forEach((v, i) => {
        if (variants.length === 1) {
            v.title = base;
            return;
        }
        const sameDate = variants.filter(o => o.date === v.date);
        const part = !v.date ? ` Part ${i + 1}` : sameDate.length > 1 ? ` Part ${sameDate.indexOf(v) + 1}` : "";
        v.title = `${base}${v.date ? ` ${v.date}` : ""}${part}`;
    });
}

function collectWorks() {

    const works = [];

    for (const [label, , , folderNames] of CATS) {

        const top = dirs(SRC).find(d => folderNames.includes(d));

        if (!top) {
            continue;
        }

        const groups = new Map();

        for (const sub of dirs(path.join(SRC, top)).sort(byName)) {
            const rawBase = sub.replace(/~\d+$/, "").trim().replace(/\s+/g, " ");
            const base = TITLE_FIX[rawBase] || rawBase;
            const dir = path.join(SRC, top, sub);
            const files = fs.readdirSync(dir).filter(f => IMG.test(f) && !f.startsWith(".")).sort(byName);
            if (files.length === 0) continue;
            if (!groups.has(base)) groups.set(base, []);
            groups.get(base).push({ dir, files, order: Number((sub.match(/~(\d+)$/) || [0, 0])[1]) });
        }

        for (const [base, variants] of groups) {
            variants.sort((a, b) => a.order - b.order);
            titleVariants(base, variants);
            for (const v of variants) {
                const cover = v.files.find(f => /^封面[.-]/.test(f));
                const photos = v.files.filter(f => f !== cover);
                const coverDup = cover && photos.find(f => md5(path.join(v.dir, f)) === md5(path.join(v.dir, cover)));
                works.push({ cat: label, title: v.title, dir: v.dir, cover, coverDup, photos });
            }
        }

    }

    return works;

}

async function wipe(backup) {

    const items = backup.pageItems.filter(i => i.pageId === PAGE);
    const keepAlbumIds = new Set(backup.mediaAlbums.filter(a => KEEP_ALBUMS.includes(a.label)).map(a => a.id));
    // 首頁圖文區塊這類地方直接引用的作品照也要保留，不然刪掉就破圖（2026/10/02 首頁 BLUEDOT／藍點的照片就是這樣不見的）
    const elsewhere = JSON.stringify(["pages", "customPages", "settings"].map(k => backup[k] || []));
    const media = backup.media.filter(m => !keepAlbumIds.has(m.albumId) && !elsewhere.includes(m.url));
    const albums = backup.mediaAlbums.filter(a => !keepAlbumIds.has(a.id));

    console.log(`刪除：PHOTOGRAPH 作品 ${items.length} 個、媒體庫照片 ${media.length} 張、相簿 ${albums.length} 個（保留 ${KEEP_ALBUMS.join("、")}）`);

    if (!RUN) return;

    // 作品自己上傳的檔案（path 不是空的）也一起從儲存空間刪掉；從媒體庫選的照片 path 是空的，由下面刪媒體時處理
    const itemFiles = items.flatMap(i => [...(i.images || []), i.coverImage || {}]).map(img => img.path).filter(Boolean);
    await pool(itemFiles.map(p => () => storageService.deleteFile(p).catch(() => {})), 8);
    await pool(items.map(i => () => tenantCollection(T, "pageItems").doc(i.id).delete()), 8);

    let done = 0;
    await pool(media.map(m => async () => {
        if (m.path) await storageService.deleteFile(m.path).catch(() => {});
        await tenantCollection(T, "media").doc(m.id).delete();
        if (++done % 200 === 0) console.log(`  媒體庫已刪 ${done}/${media.length}`);
    }), 8);

    await pool(albums.map(a => () => tenantCollection(T, "mediaAlbums").doc(a.id).delete()), 8);

}

(async () => {

    const backup = JSON.parse(fs.readFileSync(BACKUP, "utf8"));
    const oldItems = backup.pageItems.filter(i => i.pageId === PAGE);
    const oldCats = backup.pageCategories.filter(c => c.pageId === PAGE);
    const works = collectWorks();

    const perCat = {};
    works.forEach(w => { (perCat[w.cat] = perCat[w.cat] || []).push(w); });
    for (const [label] of CATS) {
        const list = perCat[label] || [];
        console.log(`\n【${label}】${list.length} 個作品`);
        list.forEach(w => {
            const old = oldItems.find(o => o.title === w.title && (oldCats.find(c => c.id === o.category) || {}).label === w.cat);
            console.log(`   ${w.title}（${w.photos.length + (w.cover && !w.coverDup ? 1 : 0)} 張${w.cover ? "，有封面" : ""}）${old ? "" : "  ← 新"}`);
        });
    }
    console.log(`\n共 ${works.length} 個作品、${works.reduce((n, w) => n + w.photos.length + (w.cover && !w.coverDup ? 1 : 0), 0)} 張照片\n`);

    await wipe(backup);

    if (!RUN) process.exit(0);

    // 分類沿用現有的（保留後台設定的分類順序），沒有的才新增
    const catIds = {};
    for (const [i, [label, nameEn]] of CATS.entries()) {
        const found = oldCats.find(c => c.label === label);
        if (found) {
            catIds[label] = found.id;
        } else {
            const ref = await tenantCollection(T, "pageCategories").add({ pageId: PAGE, label, nameEn, sortOrder: (CATS.length - i) * 10, parentCategoryId: "", createdAt: new Date(), updatedAt: new Date() });
            catIds[label] = ref.id;
        }
    }

    // 媒體庫相簿：分類 → 作品
    const now = Date.now();
    const catAlbums = {};
    for (const [i, [label]] of CATS.entries()) {
        const ref = await tenantCollection(T, "mediaAlbums").add({ label, parentAlbumId: "", createdAt: new Date(now + i) });
        catAlbums[label] = ref.id;
    }

    const catRank = Object.fromEntries(CATS.map(([l], i) => [l, CATS.length - i]));
    const counters = {};
    const usedSlugs = new Set();
    const newIdByOldId = {};
    let uploadedCount = 0;

    for (const w of works) {

        counters[w.cat] = (counters[w.cat] || 0) + 1;

        const albumRef = await tenantCollection(T, "mediaAlbums").add({ label: w.title, parentAlbumId: catAlbums[w.cat], createdAt: new Date() });
        const files = [...(w.cover && !w.coverDup ? [w.cover] : []), ...w.photos];

        const uploaded = await pool(files.map(f => async () => {
            const buf = fs.readFileSync(path.join(w.dir, f));
            const { url, path: p } = await storageService.uploadBuffer(buf, f, mime(f), "media");
            await tenantCollection(T, "media").add({ name: f, url, path: p, size: buf.length, contentType: mime(f), albumId: albumRef.id, alt: w.title, createdAt: new Date() });
            return { f, url };
        }), 4);
        uploadedCount += uploaded.length;

        const coverFile = w.cover && !w.coverDup ? w.cover : w.coverDup;
        const coverUp = uploaded.find(u => u.f === coverFile) || uploaded[0];
        // 封面也放進相簿（上傳順序本來就是封面在第一張），2026/10/02 回饋：封面也要出現在作品集裡面
        const images = uploaded.map(u => ({ id: crypto.randomUUID(), type: "image", url: u.url, path: "", alt: w.title, sourceName: u.f }));

        const old = oldItems.find(o => o.title === w.title && o.category === catIds[w.cat]);
        const catKey = CATS.find(([l]) => l === w.cat)[2];
        let slug = old && !usedSlugs.has(old.slug) ? old.slug : `${catKey}-${String(counters[w.cat]).padStart(2, "0")}-${crypto.randomBytes(2).toString("hex")}`;
        usedSlugs.add(slug);

        const ref = await tenantCollection(T, "pageItems").add({
            pageId: PAGE,
            slug,
            title: w.title,
            description: old ? old.description || "" : "",
            metaDescription: old ? old.metaDescription || "" : "",
            author: "",
            link: "",
            category: catIds[w.cat],
            published: true,
            publishAt: null,
            galleryLayout: old ? old.galleryLayout || "masonry" : "masonry",
            coverPosition: old && old.coverPosition ? old.coverPosition : "center center",
            images,
            coverImage: coverUp ? { url: coverUp.url, type: "image", alt: w.title } : null,
            modules: [],
            sortOrder: old && typeof old.sortOrder === "number" ? old.sortOrder : catRank[w.cat] * 1000 - 500 - counters[w.cat],
            createdAt: new Date(),
            updatedAt: new Date()
        });

        if (old) newIdByOldId[old.id] = ref.id;
        console.log(`✅ ${w.cat}／${w.title}：${uploaded.length} 張（累計 ${uploadedCount}）`);

    }

    // 首頁作品輪播：舊作品 id 換成新的；舊作品如果被拆成多場、名稱變了，就用名稱開頭比對
    const homeRef = tenantCollection(T, "pages").doc("home");
    const home = (await homeRef.get()).data();
    const newItems = (await tenantCollection(T, "pageItems").where("pageId", "==", PAGE).get()).docs.map(d => ({ id: d.id, ...d.data() }));
    const modules = home.modules.map(m => {
        if (m.type !== "videoCarousel" || !m.data || !Array.isArray(m.data.items)) return m;
        const items = m.data.items.map(entry => {
            const oldItem = oldItems.find(o => o.id === entry.id);
            if (!oldItem) return entry;
            const target = newItems.find(n => n.id === newIdByOldId[entry.id]) || newItems.find(n => n.title === oldItem.title) || newItems.find(n => n.title.startsWith(entry.title));
            if (!target) {
                console.log(`⚠ 首頁輪播找不到新作品：${entry.title}`);
                return entry;
            }
            return { ...entry, id: target.id, title: target.title, coverUrl: (target.coverImage || {}).url || entry.coverUrl, href: `/p/photography-services/${target.slug}` };
        });
        return { ...m, data: { ...m.data, items } };
    });
    await homeRef.update({ modules });

    console.log(`\n完成：${works.length} 個作品、${uploadedCount} 張照片`);
    process.exit(0);

})().catch(e => { console.error(e); process.exit(1); });
