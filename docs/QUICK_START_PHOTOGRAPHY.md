# 攝影服務快速開始指南

## 🎯 5 分鐘快速上手

### 步驟 1：自動初始化（推薦）

運行初始化腳本，自動在 Firebase 中創建頁面和所有分類：

```bash
node scripts/init-photography-services.js
```

✅ **什麼會發生：**
- 創建「攝影服務」頁面
- 自動添加 7 個服務分類
- 準備好讓您添加作品

### 步驟 2：登入 CMS 後台

訪問：https://bluedot-slaj.onrender.com/cms

用您的管理員帳號登入

### 步驟 3：添加作品

1. 點擊「自訂頁面」
2. 找到「攝影服務」頁面
3. 在每個分類下點擊「新增項目」
4. 上傳分類圖片和作品照片

### 步驟 4：發佈

1. 編輯「攝影服務」頁面
2. 勾選「發佈」
3. 保存變更
4. （可選）在導航菜單中添加連結

---

## 📸 7 個服務分類

| # | 服務名稱 | 英文名 |
|---|---------|-------|
| 1 | 人像與形象攝影 | Portrait & Personal Branding Photography |
| 2 | 品牌與活動紀錄 | Brand & Event Photography |
| 3 | 婚禮與人生慶典 | Weddings & Milestone Celebrations |
| 4 | 商業與美食攝影 | Commercial & Food Photography |
| 5 | 劇場與舞台影像 | Theatre & Stage Photography |
| 6 | SDE 快播快剪 | Same-Day Edit |
| 7 | 短影音／Reels製作 | Short-Form Video & Reels |

---

## 🖼️ 圖片上傳要求

所有上傳的圖片會自動處理為：

```
長邊：2048px
解析度：72dpi
格式：JPG
色彩空間：sRGB
檔案大小：800KB - 2MB（自動優化）
JPEG 品質：90（高質量）
```

✅ **支援的輸入格式：**
- JPG, PNG, WebP, GIF, TIFF, BMP

> 💡 **提示：** 不用擔心圖片大小，系統會自動調整！

---

## 🚀 完整操作流程

### A. 自動化方式（推薦）

```bash
# 1. 運行初始化腳本
node scripts/init-photography-services.js

# 2. 登入 CMS 後台並添加作品

# 3. 提交變更
git add -A
git commit -m "Add photography services"
git push
```

### B. 手動方式

1. 登入 CMS：https://bluedot-slaj.onrender.com/cms
2. 點擊「自訂頁面」→「新增頁面」
3. 填寫表單：
   - 標題：攝影服務
   - Slug：photography-services
   - 類型：分類清單型（Collection）
4. 點擊「新增」
5. 在頁面中添加 7 個分類（參考上表）
6. 為每個分類添加作品項目

---

## 📋 CMS 頁面設置

**必填項目：**
- ✅ 標題：攝影服務
- ✅ Slug：photography-services
- ✅ 頁面類型：分類清單型

**建議設置：**
- 副標題：捕捉每一個珍貴的瞬間
- 描述：探索我們的完整攝影服務範疇...
- 背景圖片：（可選）上傳精選封面

---

## 🎨 每個作品項目需要

| 項目 | 說明 |
|------|------|
| 標題 | 作品名稱或主題 |
| 描述 | 拍攝背景、風格或故事 |
| 封面圖片 | 代表該作品的精選照片 |
| 圖庫 | 3-10 張相關照片 |
| 影片（可選） | YouTube / Vimeo 連結 |

---

## 🔗 最終 URL 結構

```
https://bluedot-slaj.onrender.com/photography-services
└── /photography-services?category=人像與形象攝影
└── /photography-services?category=品牌與活動紀錄
└── ...
```

---

## 🆘 遇到問題？

### 初始化腳本失敗

**檢查清單：**
- ✅ `.env` 檔案是否有 `GOOGLE_APPLICATION_CREDENTIALS`
- ✅ Firebase 認證 JSON 檔案是否存在
- ✅ 是否有 Firebase 數據庫訪問權限

**解決方案：**
```bash
# 確保環境變數正確
echo $GOOGLE_APPLICATION_CREDENTIALS

# 手動運行 CMS 初始化
npm start
# 然後在 CMS 後台手動添加
```

### 圖片上傳失敗

**常見原因：**
- 檔案超過 2MB → 換一張較小的圖片
- 格式不支援 → 轉換為 JPG 或 PNG
- 解析度太低 → 上傳更高解析度的圖片

---

## 📚 更多資訊

- 📖 完整指南：[PHOTOGRAPHY_SERVICES.md](./PHOTOGRAPHY_SERVICES.md)
- 🖼️ 圖片配置：[IMAGE_CONFIG.md](./IMAGE_CONFIG.md)
- 💾 模板數據：[/data/photography-services-template.json](../data/photography-services-template.json)

---

## ✅ 檢查清單

使用此清單確保所有內容都已設置：

- [ ] 運行了初始化腳本（或手動創建了頁面）
- [ ] 登入了 CMS 後台
- [ ] 為每個服務分類添加了至少 1 個作品項目
- [ ] 所有圖片都已上傳並審視
- [ ] 頁面已發佈（勾選「發佈」選項）
- [ ] 測試了頁面連結：/photography-services
- [ ] （可選）在導航菜單中添加了連結
- [ ] 提交了 git 變更

---

## 🎉 完成！

您的攝影服務頁面現在應該已上線！

👉 訪問：https://bluedot-slaj.onrender.com/photography-services

---

**最後更新**: 2026-09-22  
**需要幫助？** 聯絡開發團隊或檢查完整指南
