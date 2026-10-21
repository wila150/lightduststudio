# PortfolioWeb 攝影服務完整文檔

本目錄包含 PortfolioWeb 項目的所有技術文檔和操作指南，特別聚焦於攝影服務功能的實現。

## 📚 文檔導覽

### 🚀 快速開始（新用戶必讀）

| 文檔 | 描述 | 閱讀時間 |
|------|------|--------|
| [QUICK_START_PHOTOGRAPHY.md](./QUICK_START_PHOTOGRAPHY.md) | 5 分鐘快速上手攝影服務 | 5 min |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | 完整的部署和上線指南 | 15-20 min |

### 📖 詳細文檔

| 文檔 | 內容 | 適合 |
|------|------|------|
| [PHOTOGRAPHY_SERVICES.md](./PHOTOGRAPHY_SERVICES.md) | 攝影服務設置和管理指南 | CMS 用戶 |
| [IMAGE_CONFIG.md](./IMAGE_CONFIG.md) | 圖片上傳和處理配置 | 管理員 |
| [API_INTEGRATION.md](./API_INTEGRATION.md) | API 端點和前端集成 | 開發者 |

### 📋 配置文件

| 檔案 | 用途 |
|------|------|
| [/data/photography-services-template.json](../data/photography-services-template.json) | 攝影服務分類結構模板 |
| [/data/sample-photography-items.json](../data/sample-photography-items.json) | 示例作品項目數據 |
| [/data/nav-config-template.json](../data/nav-config-template.json) | 導航菜單配置示例 |

### 🛠️ 自動化腳本

| 腳本 | 功能 |
|------|------|
| [/scripts/init-photography-services.js](../scripts/init-photography-services.js) | 自動初始化攝影服務頁面和分類 |

---

## 🎯 適用人群和快速路線

### 👨‍💼 網站擁有者 / CMS 用戶

**您需要做什麼：** 添加攝影作品到網站

**推薦路線：**
1. 閱讀 [QUICK_START_PHOTOGRAPHY.md](./QUICK_START_PHOTOGRAPHY.md)
2. 準備作品素材（圖片和文案）
3. 登入 CMS，按照步驟添加內容
4. 發佈頁面

**所需時間：** 2-4 小時（取決於作品數量）

---

### 👨‍💻 開發者 / 技術管理員

**您需要做什麼：** 部署和維護系統

**推薦路線：**
1. 閱讀 [IMAGE_CONFIG.md](./IMAGE_CONFIG.md) - 了解圖片處理
2. 運行 [init-photography-services.js](../scripts/init-photography-services.js) 自動化腳本
3. 參考 [API_INTEGRATION.md](./API_INTEGRATION.md) 進行定制開發
4. 按 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) 進行完整部署

**所需時間：** 1-2 小時（第一次部署）

---

### 📊 項目管理 / 產品經理

**您需要做什麼：** 規劃內容策略和時間表

**推薦路線：**
1. 閱讀 [QUICK_START_PHOTOGRAPHY.md](./QUICK_START_PHOTOGRAPHY.md) 了解功能
2. 檢查 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) 中的時間估計
3. 使用 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) 中的部署清單進行項目追蹤

**所需時間：** 15 分鐘

---

## 🏗️ 系統架構概述

### 核心功能

```
攝影服務頁面 (/p/photography-services)
├── 分類篩選 (7 個服務分類)
│   ├── 人像與形象攝影
│   ├── 品牌與活動紀錄
│   ├── 婚禮與人生慶典
│   ├── 商業與美食攝影
│   ├── 劇場與舞台影像
│   ├── SDE 快播快剪
│   └── 短影音／Reels製作
└── 作品項目 (每個分類可有多個)
    ├── 標題 & 描述
    ├── 封面圖片
    └── 完整圖庫
```

### 技術棧

| 層級 | 技術 |
|------|------|
| **後端** | Node.js / Express |
| **數據庫** | Firebase Firestore |
| **存儲** | Firebase Storage |
| **圖片處理** | Sharp (2048px, 72dpi, sRGB, JPG) |
| **前端** | HTML/CSS/JavaScript |

---

## 📊 7 個攝影服務分類

| # | 中文名 | 英文名 | 描述 |
|---|--------|--------|------|
| 1 | 人像與形象攝影 | Portrait & Personal Branding | 捕捉人物神情，建立個人/品牌形象 |
| 2 | 品牌與活動紀錄 | Brand & Event Photography | 記錄品牌現場的氛圍和互動 |
| 3 | 婚禮與人生慶典 | Weddings & Milestone Celebrations | 收藏人生重要篇章的情感時刻 |
| 4 | 商業與美食攝影 | Commercial & Food Photography | 呈現產品質感和料理魅力 |
| 5 | 劇場與舞台影像 | Theatre & Stage Photography | 捕捉表演的張力和藝術能量 |
| 6 | SDE 快播快剪 | Same-Day Edit | 當日快速編輯影像作品 |
| 7 | 短影音／Reels製作 | Short-Form Video & Reels | 製作有溫度的短影片內容 |

---

## 🖼️ 圖片規格

所有上傳的圖片都會自動處理為統一的規格：

```
長邊尺寸：2048px（自動按比例縮放）
解析度：72dpi（網路標準）
輸出格式：JPG（高效存儲）
色彩空間：sRGB（網路標準色彩）
檔案大小：800KB - 2MB（自動優化）
JPEG 品質：90（高質量）
```

**支援的輸入格式：** JPG, PNG, WebP, GIF, TIFF, BMP

詳見 [IMAGE_CONFIG.md](./IMAGE_CONFIG.md)

---

## 🚀 快速部署流程

### 1️⃣ 準備階段（15 分鐘）

```bash
# 確認環境
node --version
echo $GOOGLE_APPLICATION_CREDENTIALS

# 準備作品素材（至少 3-5 個 per 分類）
# 準備好文案和圖片
```

### 2️⃣ 自動初始化（5 分鐘）

```bash
node scripts/init-photography-services.js
```

### 3️⃣ 內容添加（1-2 小時）

登入 CMS：https://lightduststudio-q8qk.onrender.com/cms
- 為每個分類添加作品項目
- 上傳圖片和設置描述

### 4️⃣ 配置導航（10 分鐘）

- 在導航菜單中添加「攝影服務」連結

### 5️⃣ 發佈和測試（15 分鐘）

- 啟用頁面發佈
- 測試所有功能
- 驗證響應式設計

### 6️⃣ 上線（5 分鐘）

```bash
git add -A
git commit -m "Add photography services"
git push
```

---

## ✅ 檢查清單

### 前期準備
- [ ] 所有環境變數已配置
- [ ] 作品素材已準備
- [ ] 文案描述已完成

### 系統部署
- [ ] 初始化腳本已執行
- [ ] 7 個分類已創建
- [ ] 所有項目已添加

### 內容上線
- [ ] 所有圖片已上傳
- [ ] 頁面已發佈
- [ ] 導航菜單已配置

### 測試驗證
- [ ] 頁面正常加載
- [ ] 分類篩選正常
- [ ] 響應式設計正常
- [ ] SEO 配置完成

### 交付完成
- [ ] 代碼已提交
- [ ] 團隊已通知
- [ ] 客戶已測試

---

## 🔗 相關資源

### 內部資源
- 項目 Git 倉庫：https://github.com/wila150/lightduststudio
- CMS 後台：https://lightduststudio-q8qk.onrender.com/cms
- 現場網址：https://lightduststudio-q8qk.onrender.com

### 外部技術文檔
- [Sharp 圖片處理文檔](https://sharp.pixelplumbing.com/)
- [Firebase Firestore 文檔](https://firebase.google.com/docs/firestore)
- [Express.js 文檔](https://expressjs.com/)

---

## 📞 技術支持

遇到問題？按照以下步驟：

1. **檢查文檔** - 首先查閱相關的文檔文件
2. **查看示例** - 參考 `/data` 中的示例文件
3. **檢查日誌** - 運行時查看控制台輸出
4. **聯絡開發團隊** - 如問題仍未解決

常見問題見 [DEPLOYMENT_GUIDE.md#常見問題解決](./DEPLOYMENT_GUIDE.md#常見問題解決)

---

## 📝 文檔維護

| 文檔 | 上次更新 | 維護者 |
|------|--------|--------|
| README.md | 2026-09-22 | Dev Team |
| QUICK_START_PHOTOGRAPHY.md | 2026-09-22 | Dev Team |
| DEPLOYMENT_GUIDE.md | 2026-09-22 | Dev Team |
| PHOTOGRAPHY_SERVICES.md | 2026-09-22 | Dev Team |
| IMAGE_CONFIG.md | 2026-09-22 | Dev Team |
| API_INTEGRATION.md | 2026-09-22 | Dev Team |

---

## 📈 性能和 SEO

### 優化措施

✅ 圖片自動壓縮（JPG, 2048px）
✅ 響應式設計（移動優先）
✅ SEO 友善的 URL 結構
✅ Meta 標籤和結構化數據
✅ 頁面快取優化
✅ CDN 圖片存儲（Firebase Storage）

### 監控指標

定期監控：
- 頁面加載時間（< 3 秒目標）
- 圖片加載質量
- 移動設備體驗
- Google Analytics 數據

---

## 🎉 完成！

您現在已有所有需要的文檔和工具來完成攝影服務的部署和管理。

**建議步驟：**
1. 根據您的角色選擇合適的文檔開始閱讀
2. 按照指南逐步執行
3. 使用檢查清單追蹤進度
4. 遇到問題時參考文檔

祝您部署順利！🎉

---

**更新日期**: 2026-09-22  
**版本**: 1.0  
**狀態**: 完成並可用於生產環境
